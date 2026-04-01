"use client";

import { useState } from "react";
import { Calendar, Clock, AlertTriangle, Filter } from "lucide-react";
import {
  getSourceColor,
  getSourceIcon,
  getSourceLabel,
} from "@/lib/app-utils";
import type { EventSource } from "@/lib/app-data-types";
import { useAppData } from "@/lib/use-app-data";

const sourceFilters: { key: EventSource | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "operation", label: "⚙️ Operation" },
  { key: "crm", label: "📊 CRM" },
  { key: "client", label: "🏥 Client" },
  { key: "finance", label: "💰 การเงิน" },
  { key: "hr", label: "👤 HR" },
  { key: "ticket", label: "🎫 Ticket" },
];

export default function TimelinePage() {
  const { payload, loading, error } = useAppData();
  const stats = payload?.stats.timeline;
  const events = payload?.data.events ?? [];
  const [filter, setFilter] = useState<EventSource | "all">("all");

  if (loading || !stats) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => e.source === filter);

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const today = new Date("2026-03-30").toISOString().split("T")[0];

  function formatDateLabel(dateStr: string): string {
    if (dateStr === today) return "วันนี้";
    const d = new Date(dateStr);
    const diff = Math.round((d.getTime() - new Date(today).getTime()) / 86400000);
    if (diff === 1) return "พรุ่งนี้";
    if (diff === -1) return "เมื่อวาน";
    return d.toLocaleDateString("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  const statCards = [
    {
      label: "วันนี้",
      value: stats.todayEvents,
      icon: Calendar,
      color: "text-blue-400",
    },
    {
      label: "ด่วน",
      value: stats.urgentEvents,
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      label: "สัปดาห์นี้",
      value: stats.thisWeek,
      icon: Clock,
      color: "text-amber-400",
    },
    {
      label: "ทั้งหมด",
      value: stats.totalEvents,
      icon: Calendar,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
            <Calendar size={22} className="text-navy-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Timeline & Calendar
            </h1>
            <p className="text-xs text-foreground-muted">
              ภาพรวม Deadline และกิจกรรมจากทุก Module
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="bg-navy-900/50 border border-border rounded-2xl p-4"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground-muted">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="text-foreground-muted shrink-0" />
        {sourceFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                : "bg-navy-800 text-foreground-muted border border-border hover:border-gold-500/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  date === today
                    ? "bg-gold-500/20 text-gold-400"
                    : "bg-navy-800 text-foreground-muted"
                }`}
              >
                {formatDateLabel(date)}
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-foreground-muted font-mono">
                {date}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-2 ml-2 border-l-2 border-border pl-4">
              {grouped[date]
                .sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"))
                .map((ev) => (
                  <div
                    key={ev.id}
                    className={`bg-navy-900/50 border border-border rounded-xl p-4 hover:border-gold-500/20 transition-all ${
                      ev.priority === "urgent" ? "border-l-2 border-l-red-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">
                            {getSourceIcon(ev.source)}
                          </span>
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {ev.title}
                          </h3>
                        </div>
                        <p className="text-xs text-foreground-muted">
                          {ev.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${getSourceColor(
                              ev.source
                            )}`}
                          >
                            {getSourceLabel(ev.source)}
                          </span>
                          {ev.clinic && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy-700 text-foreground-muted">
                              🏥 {ev.clinic}
                            </span>
                          )}
                          {ev.assignee && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy-700 text-foreground-muted">
                              👤 {ev.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {ev.time && (
                          <p className="text-xs font-mono text-gold-400">
                            {ev.time}
                          </p>
                        )}
                        {ev.priority === "urgent" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 mt-1 inline-block">
                            ด่วน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
