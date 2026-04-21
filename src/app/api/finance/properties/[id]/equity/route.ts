import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  properties,
  mortgagePayments,
  propertyValuations,
  mortgageRates,
  propertyIncome,
} from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { format, addMonths, isBefore, startOfMonth } from "date-fns";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const propertyId = parseInt(id);

    // Fetch property
    const propertyResult = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (propertyResult.length === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const property = propertyResult[0];

    // Fetch all payments (ASC), all valuations (ASC), latest rate, all income (ASC)
    const [payments, valuations, rates, incomeRecords] = await Promise.all([
      db
        .select()
        .from(mortgagePayments)
        .where(eq(mortgagePayments.propertyId, propertyId))
        .orderBy(asc(mortgagePayments.date)),
      db
        .select()
        .from(propertyValuations)
        .where(eq(propertyValuations.propertyId, propertyId))
        .orderBy(asc(propertyValuations.date)),
      db
        .select()
        .from(mortgageRates)
        .where(eq(mortgageRates.propertyId, propertyId))
        .orderBy(desc(mortgageRates.effectiveDate))
        .limit(1),
      db
        .select()
        .from(propertyIncome)
        .where(eq(propertyIncome.propertyId, propertyId))
        .orderBy(asc(propertyIncome.date)),
    ]);

    // Current value: latest valuation or purchase price
    const currentValue =
      valuations.length > 0
        ? valuations[valuations.length - 1].estimatedValue
        : property.purchasePrice;

    // Loan balance: original - sum of all principal payments
    const totalPrincipal = payments.reduce(
      (sum, p) => sum + p.principalAmount,
      0
    );
    const loanBalance = property.loanAmountOriginal - totalPrincipal;

    // Equity calculations
    const totalEquity = currentValue - loanBalance;
    const equityFromPrincipal = totalPrincipal;
    const equityFromAppreciation = currentValue - property.purchasePrice;

    // LVR (loan-to-value ratio) as decimal
    const lvr = currentValue > 0 ? loanBalance / currentValue : null;

    // Current rate
    const currentRate = rates.length > 0 ? rates[0].annualRate : null;

    // Payment summary
    const totalPaid = payments.reduce((sum, p) => sum + p.paymentAmount, 0);
    const totalInterest = payments.reduce(
      (sum, p) => sum + p.interestAmount,
      0
    );
    const avgMonthlyPayment =
      payments.length > 0 ? totalPaid / payments.length : 0;

    // Income calculations
    const totalIncome = incomeRecords.reduce((sum, i) => sum + i.amount, 0);
    const totalCosts = totalPaid;
    const netCashflow = totalIncome - totalCosts;

    // Gross yield: annualize income if we have data spanning at least one month
    let grossYield: number | null = null;
    if (incomeRecords.length > 0 && currentValue > 0) {
      const firstIncomeDate = new Date(incomeRecords[0].date);
      const lastIncomeDate = new Date(incomeRecords[incomeRecords.length - 1].date);
      const monthsOfData =
        (lastIncomeDate.getFullYear() - firstIncomeDate.getFullYear()) * 12 +
        (lastIncomeDate.getMonth() - firstIncomeDate.getMonth());
      if (monthsOfData >= 1) {
        const annualIncome = (totalIncome / monthsOfData) * 12;
        grossYield = annualIncome / currentValue;
      } else if (incomeRecords.length >= 1) {
        // Less than a month of data but have records — annualize from count=1 month
        const annualIncome = totalIncome * 12;
        grossYield = annualIncome / currentValue;
      }
    }

    // Monthly timeline: one entry per month from first payment to now
    const monthlyTimeline: Array<{
      month: string;
      estimatedValue: number;
      cumulativePrincipal: number;
      loanBalance: number;
      equity: number;
      income: number;
      netCashflow: number;
    }> = [];

    if (payments.length > 0) {
      const firstPaymentDate = new Date(payments[0].date);
      const now = new Date();
      let currentMonth = startOfMonth(firstPaymentDate);
      let cumulativePrincipal = 0;

      while (
        isBefore(currentMonth, now) ||
        format(currentMonth, "yyyy-MM") === format(now, "yyyy-MM")
      ) {
        const monthStr = format(currentMonth, "yyyy-MM");
        const monthEnd = format(currentMonth, "yyyy-MM") + "-31"; // safe upper bound for comparison

        // Sum principal for payments in this month
        for (const p of payments) {
          if (p.date.substring(0, 7) === monthStr) {
            cumulativePrincipal += p.principalAmount;
          }
        }

        // Step-function valuation: most recent valuation at or before month end
        let estimatedValue = property.purchasePrice;
        for (const v of valuations) {
          if (v.date <= monthEnd) {
            estimatedValue = v.estimatedValue;
          }
        }

        const monthLoanBalance =
          property.loanAmountOriginal - cumulativePrincipal;

        // Sum income for this month
        let monthIncome = 0;
        for (const inc of incomeRecords) {
          if (inc.date.substring(0, 7) === monthStr) {
            monthIncome += inc.amount;
          }
        }

        // Sum payments for this month
        let monthPayment = 0;
        for (const p of payments) {
          if (p.date.substring(0, 7) === monthStr) {
            monthPayment += p.paymentAmount;
          }
        }

        monthlyTimeline.push({
          month: monthStr,
          estimatedValue,
          cumulativePrincipal,
          loanBalance: monthLoanBalance,
          equity: estimatedValue - monthLoanBalance,
          income: monthIncome,
          netCashflow: monthIncome - monthPayment,
        });

        currentMonth = addMonths(currentMonth, 1);
      }
    }

    return NextResponse.json({
      currentValue,
      loanBalance,
      totalEquity,
      equityFromPrincipal,
      equityFromAppreciation,
      lvr,
      currentRate,
      totalIncome,
      totalCosts,
      netCashflow,
      grossYield,
      paymentSummary: {
        totalPaid,
        totalInterest,
        totalPrincipal,
        avgMonthlyPayment,
      },
      monthlyTimeline,
    });
  } catch (error) {
    console.error("Error fetching equity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch equity data" },
      { status: 500 }
    );
  }
}
