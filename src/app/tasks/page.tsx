"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Task } from "@/types";
import { TaskTable, TaskFilters } from "@/components/tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(tasks.map((t) => t.area))];
    return uniqueAreas.sort();
  }, [tasks]);

  const frequencies = useMemo(() => {
    const uniqueFrequencies = [...new Set(tasks.map((t) => t.frequency))];
    return uniqueFrequencies.sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedArea && task.area !== selectedArea) return false;
      if (selectedFrequency && task.frequency !== selectedFrequency) return false;
      return true;
    });
  }, [tasks, selectedArea, selectedFrequency]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <TaskFilters
          areas={areas}
          frequencies={frequencies}
          selectedArea={selectedArea}
          selectedFrequency={selectedFrequency}
          onAreaChange={setSelectedArea}
          onFrequencyChange={setSelectedFrequency}
        />
        <TaskTable tasks={filteredTasks} onTaskComplete={fetchTasks} />
      </main>
    </div>
  );
}
