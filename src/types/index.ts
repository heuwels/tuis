export interface Task {
  id: number;
  name: string;
  area: string;
  frequency: string;
  assignedDay: string | null;
  season: string | null;
  notes: string | null;
  lastCompleted: string | null;
  nextDue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type TaskStatus = "overdue" | "today" | "upcoming" | "future" | "adhoc";
