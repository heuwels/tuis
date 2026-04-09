"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Task } from "@/types";
import { TaskTable, TaskFilters, TaskForm, TaskDetail, DeleteTaskDialog } from "@/components/tasks";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        const matchesExtended = task.extendedNotes?.toLowerCase().includes(query);
        if (!matchesName && !matchesNotes && !matchesExtended) return false;
      }
      return true;
    });
  }, [tasks, selectedArea, selectedFrequency, searchQuery]);

  const handleAddNew = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = (task: Task) => {
    setDeletingTask(task);
    setIsDeleteOpen(true);
  };

  const handleView = (task: Task) => {
    setViewingTask(task);
    setIsDetailOpen(true);
  };

  const actions = (
    <>
      <span className="text-sm text-muted-foreground">
        {filteredTasks.length} of {tasks.length} tasks
      </span>
      <Button onClick={handleAddNew}>
        <Plus className="h-4 w-4 mr-2" />
        Add Task
      </Button>
    </>
  );

  return (
    <AppLayout title="All Tasks" actions={actions}>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading tasks...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <TaskFilters
            areas={areas}
            frequencies={frequencies}
            selectedArea={selectedArea}
            selectedFrequency={selectedFrequency}
            searchQuery={searchQuery}
            onAreaChange={setSelectedArea}
            onFrequencyChange={setSelectedFrequency}
            onSearchChange={setSearchQuery}
          />
          <TaskTable
            tasks={filteredTasks}
            onTaskComplete={fetchTasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </div>
      )}

      <TaskForm
        task={editingTask}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchTasks}
      />

      <TaskDetail
        task={viewingTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={() => {
          setIsDetailOpen(false);
          if (viewingTask) handleEdit(viewingTask);
        }}
      />

      <DeleteTaskDialog
        task={deletingTask}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={fetchTasks}
      />
    </AppLayout>
  );
}
