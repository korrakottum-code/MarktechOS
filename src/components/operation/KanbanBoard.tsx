"use client";

import { useState } from "react";
import {
  OperationTask,
  TaskStatus,
  statusColumns,
} from "@/lib/mock-operations";
import TaskCard from "./TaskCard";

interface Props {
  tasks: OperationTask[];
}

export default function KanbanBoard({ tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask ? { ...t, status } : t))
    );
    setDraggedTask(null);
  };

  return (
    <div className="bg-navy-900 border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          📌 Kanban Board — งานทั้งหมด
        </h2>
        <p className="text-sm text-foreground-muted">
          ลาก & วางเพื่อเปลี่ยนสถานะ
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {statusColumns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-xl border-t-2 ${col.color} bg-navy-950/50 p-3`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.key)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  {col.label}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-navy-700 text-foreground-muted">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className={`transition-opacity ${
                      draggedTask === task.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <TaskCard task={task} />
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-foreground-muted/30">
                    <p className="text-2xl mb-1">📭</p>
                    <p className="text-xs">ไม่มีงาน</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
