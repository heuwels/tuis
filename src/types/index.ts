export interface User {
  id: number;
  name: string;
  color: string;
  createdAt: string | null;
}

export interface Task {
  id: number;
  name: string;
  area: string;
  frequency: string;
  assignedDay: string | null;
  season: string | null;
  notes: string | null;
  extendedNotes: string | null;
  assignedTo: number | null;
  applianceId: number | null;
  lastCompleted: string | null;
  nextDue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskWithUser extends Task {
  assignedUser?: User | null;
}

export type TaskStatus = "overdue" | "today" | "upcoming" | "future" | "adhoc";

export interface Appliance {
  id: number;
  name: string;
  location: string | null;
  brand: string | null;
  model: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  manualUrl: string | null;
  warrantyDocUrl: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Vendor {
  id: number;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  rating: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Completion {
  id: number;
  taskId: number;
  completedAt: string;
  completedBy: number | null;
  vendorId: number | null;
  cost: string | null;
  costAmount: number | null;
}

export interface TaskWithAppliance extends Task {
  appliance?: Appliance | null;
}

export interface CompletionWithVendor extends Completion {
  vendor?: Vendor | null;
}

export interface Quote {
  id: number;
  vendorId: number | null;
  description: string;
  total: number;
  labour: number | null;
  materials: number | null;
  other: number | null;
  status: string;
  receivedDate: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface QuoteWithVendor extends Quote {
  vendorName?: string | null;
  vendorCategory?: string | null;
}

export interface Vehicle {
  id: number;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  regoNumber: string | null;
  regoState: string | null;
  vin: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentOdometer: number | null;
  imageUrl: string | null;
  regoExpiry: string | null;
  insuranceProvider: string | null;
  insuranceExpiry: string | null;
  warrantyExpiryDate: string | null;
  warrantyExpiryKm: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VehicleService {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  vendorId: number | null;
  cost: number | null;
  description: string;
  serviceType: string | null;
  receiptUrl: string | null;
  isDiy: number | null;
  notes: string | null;
  createdAt: string | null;
}

export interface VehicleServiceWithVendor extends VehicleService {
  vendorName?: string | null;
}

export interface FuelLog {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number;
  litres: number;
  costTotal: number;
  costPerLitre: number | null;
  station: string | null;
  isFullTank: number | null;
  notes: string | null;
  createdAt: string | null;
}

export interface VehicleWithDetails extends Vehicle {
  services?: VehicleServiceWithVendor[];
  fuelLogs?: FuelLog[];
}

export interface VehicleCostSummary {
  totalFuelCost: number;
  totalServiceCost: number;
  totalCost: number;
  totalFuelLitres: number;
  totalKmTracked: number;
  costPerKm: number | null;
  avgFuelConsumption: number | null;
}

export interface Property {
  id: number;
  address: string;
  purchasePrice: number;
  purchaseDate: string;
  loanAmountOriginal: number;
  loanTermYears: number | null;
  lender: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MortgageRate {
  id: number;
  propertyId: number;
  effectiveDate: string;
  annualRate: number;
  notes: string | null;
  createdAt: string | null;
}

export interface MortgagePayment {
  id: number;
  propertyId: number;
  date: string;
  paymentAmount: number;
  interestAmount: number;
  principalAmount: number;
  notes: string | null;
  createdAt: string | null;
}

export interface PropertyValuation {
  id: number;
  propertyId: number;
  date: string;
  estimatedValue: number;
  source: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface HouseholdExpense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendorId: number | null;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HouseholdExpenseWithVendor extends HouseholdExpense {
  vendorName?: string | null;
}
