"use client";

import {
  mockTasks,
  getOperationStats,
} from "@/lib/mock-operations";
import { formatCurrency } from "@/lib/mock-data";
import KanbanBoard from "@/components/operation/KanbanBoard";
import AdsPerformance from "@/components/operation/AdsPerformance";
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Target,
  TrendingUp,
} from "lucide-react";

export default function OperationPage() {
  const stats = getOperationStats();

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          ⚙️ Operation & Content
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
            Module 2
          </span>
        </h1>
        <p className="text-foreground-muted mt-1">
          จัดการงาน Content · ติดตามแคมเปญ · วัดผล Ads Performance — แทน
          Monday.com
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
      <KanbanBoard tasks={mockTasks} />

      {/* Ads Performance */}
      <AdsPerformance />
    </div>
  );
}
