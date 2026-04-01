"use client";

import { useState } from "react";
import type { OperationTask, TaskStatus } from "@/lib/app-data-types";
import { statusColumns } from "@/lib/app-utils";
import TaskCard from "./TaskCard";
import { Plus } from "lucide-react";

interface Props {
  tasks: OperationTask[];
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
  onEditTask?: (task: OperationTask) => void;
}

export default function KanbanBoard({ 
  tasks: initialTasks, 
  onTaskStatusChange, 
  onAddTask, 
  onEditTask 
}: Props) {
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
    onTaskStatusChange?.(draggedTask, status);
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
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {col.label}
                  </h3>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-navy-700 text-foreground-muted">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3 pb-3">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`transition-opacity transition-transform hover:scale-[1.02] cursor-grab active:cursor-grabbing ${
                        draggedTask === task.id ? "opacity-40" : "opacity-100"
                      }`}
                      onClick={() => onEditTask?.(task)}
                    >
                      <TaskCard task={task} />
                    </div>
                  ))
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center opacity-30 select-none">
                    <p className="text-[11px] text-foreground-muted">ยังไม่มีงานในส่วนนี้</p>
                  </div>
                )}
                
                {/* Add Task Button at Bottom */}
                <button
                  onClick={() => onAddTask?.(col.key)}
                  className="w-full py-3 border border-dashed border-border/50 rounded-xl flex items-center justify-center gap-2 text-xs text-foreground-muted hover:text-foreground hover:bg-navy-800 hover:border-gold-500/30 transition-all group"
                >
                  <Plus size={14} className="group-hover:text-gold-400" />
                  <span>สร้างงานใหม่</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
