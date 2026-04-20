"use client";

import { useEffect, useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { HouseholdExpenseWithVendor } from "@/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseList() {
  const [expenses, setExpenses] = useState<HouseholdExpenseWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<HouseholdExpenseWithVendor | null>(null);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/finance/expenses");
      if (response.ok) {
        setExpenses(await response.json());
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Listen for "Add Expense" button in AppLayout header
  useEffect(() => {
    const handler = () => {
      setEditingExpense(null);
      setIsFormOpen(true);
    };
    window.addEventListener("open-expense-form", handler);
    return () => window.removeEventListener("open-expense-form", handler);
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(expenses.map((e) => e.category)));
    unique.sort();
    return unique;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (dateFrom) {
      result = result.filter((e) => e.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.date <= dateTo);
    }
    return result;
  }, [expenses, selectedCategory, dateFrom, dateTo]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const handleEdit = (expense: HouseholdExpenseWithVendor) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = async (expense: HouseholdExpenseWithVendor) => {
    if (
      !window.confirm(
        `Delete expense "${expense.description}"? This cannot be undone.`
      )
    )
      return;

    try {
      const response = await fetch(`/api/finance/expenses/${expense.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("")}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Date range filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            From
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            To
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-auto"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear dates
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">
          Loading expenses...
        </p>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {selectedCategory || dateFrom || dateTo
                ? "No expenses match the current filters."
                : "No expenses yet. Add your first expense to start tracking household costs."}
            </p>
            {!selectedCategory && !dateFrom && !dateTo && (
              <Button
                onClick={() => {
                  setEditingExpense(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <ExpensesTable
            expenses={filteredExpenses}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <div className="text-right text-sm text-muted-foreground">
            {filteredExpenses.length} expense
            {filteredExpenses.length !== 1 ? "s" : ""} &middot; Total:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(filteredTotal)}
            </span>
          </div>
        </>
      )}

      <ExpenseForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingExpense(null);
        }}
        onSave={fetchExpenses}
        expense={editingExpense || undefined}
      />
    </div>
  );
}

// MARK: - Expenses Table

function ExpensesTable({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: HouseholdExpenseWithVendor[];
  onEdit: (expense: HouseholdExpenseWithVendor) => void;
  onDelete: (expense: HouseholdExpenseWithVendor) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
      {/* Desktop header */}
      <div className="hidden md:grid md:grid-cols-[100px_120px_1fr_100px_120px_80px] gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-800 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>Date</span>
        <span>Category</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
        <span>Vendor</span>
        <span>Actions</span>
      </div>

      <div className="divide-y">
        {expenses.map((expense) => (
          <div key={expense.id}>
            {/* Desktop row */}
            <div className="hidden md:grid md:grid-cols-[100px_120px_1fr_100px_120px_80px] gap-2 px-4 py-3 items-center">
              <span className="text-xs text-muted-foreground">
                {format(parseISO(expense.date), "d MMM yy")}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {expense.category}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {expense.description}
              </span>
              <span className="text-sm font-semibold text-right">
                {formatCurrency(expense.amount)}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {expense.vendorName || "\u2014"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(expense)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(expense)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Mobile row */}
            <div className="md:hidden px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {expense.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {expense.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(expense.date), "d MMM")}
                    </span>
                    {expense.vendorName && (
                      <span className="text-xs text-muted-foreground">
                        {expense.vendorName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <p className="font-semibold">
                    {formatCurrency(expense.amount)}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(expense)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(expense)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
