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
}

export interface TaskWithAppliance extends Task {
  appliance?: Appliance | null;
}

export interface CompletionWithVendor extends Completion {
  vendor?: Vendor | null;
}
