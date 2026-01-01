import { Dashboard } from "@/components/dashboard";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Chore Calendar</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/stats"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Statistics
            </Link>
            <Link
              href="/tasks"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              All Tasks
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
