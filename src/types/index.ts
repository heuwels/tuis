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
  assignedTo: number | null;
  lastCompleted: string | null;
  nextDue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskWithUser extends Task {
  assignedUser?: User | null;
}

export type TaskStatus = "overdue" | "today" | "upcoming" | "future" | "adhoc";
