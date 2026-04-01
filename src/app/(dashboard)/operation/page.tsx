"use client";

import { useState } from "react";
import type { OperationTask, TaskStatus } from "@/lib/app-data-types";
import { formatCurrency } from "@/lib/app-utils";
import KanbanBoard from "@/components/operation/KanbanBoard";
import AdsPerformance from "@/components/operation/AdsPerformance";
import TaskFormModal from "@/components/operation/TaskFormModal";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import {
  Layers,
  Clock,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

export default function OperationPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const stats = payload?.stats.operation;
  const tasks = (payload?.data.operationTasks ?? []) as OperationTask[];
  const metrics = payload?.data.adsMetrics ?? [];

  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    task?: OperationTask;
    initialStatus?: TaskStatus;
  }>({ open: false });

  function handleTaskStatusChange(taskId: string, newStatus: string) {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    patchSection("operationTasks", updated as OperationTask[]);
  }

  function handleSaveTask(task: OperationTask) {
    const existing = tasks.find((t) => t.id === task.id);
    const updated = existing
      ? tasks.map((t) => (t.id === task.id ? task : t))
      : [...tasks, task];
    patchSection("operationTasks", updated as OperationTask[]);
    setTaskModal({ open: false });
  }

  function handleDeleteTask(id: string) {
    const updated = tasks.filter((t) => t.id !== id);
    patchSection("operationTasks", updated as OperationTask[]);
    setTaskModal({ open: false });
  }

  if (loading || !stats) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const statCards = [
    {
      label: "งานทั้งหมด",
      value: stats.total.toString(),
      sub: `${stats.done} เสร็จแล้ว`,
      icon: Layers,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "กำลังทำ",
      value: stats.inProgress.toString(),
      sub: "In Progress",
      icon: Clock,
      color: "text-amber-400",
      bg: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "เลย Deadline",
      value: stats.overdue.toString(),
      sub: stats.overdue > 0 ? "ต้องเร่งมือ!" : "ไม่มี — เยี่ยม!",
      icon: AlertTriangle,
      color: stats.overdue > 0 ? "text-red-400" : "text-emerald-400",
      bg:
        stats.overdue > 0
          ? "from-red-500/20 to-red-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "งบแอดรวม",
      value: formatCurrency(stats.totalAdSpend),
      sub: `CPL เฉลี่ย ${formatCurrency(stats.avgCPL)}`,
      icon: DollarSign,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modals */}
      {taskModal.open && (
        <TaskFormModal
          task={taskModal.task}
          initialStatus={taskModal.initialStatus}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setTaskModal({ open: false })}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
            Module 4
          </span>
          <span className="text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
            Phase 3: Production & Content
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground font-bold">
          Operation & Production Hub
        </h1>
        <p className="text-foreground-muted mt-1">
          จัดการงาน Content · ติดตามแคมเปญ · วัดผล Ads Performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center`}
                >
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-foreground-muted">{card.label}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        tasks={tasks} 
        onTaskStatusChange={handleTaskStatusChange}
        onAddTask={(status) => setTaskModal({ open: true, initialStatus: status })}
        onEditTask={(task) => setTaskModal({ open: true, task })}
      />

      {/* Ads Performance */}
      <AdsPerformance metrics={metrics} />
    </div>
  );
}
