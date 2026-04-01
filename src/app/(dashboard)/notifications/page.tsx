"use client";

import { useState } from "react";
import { Bell, Check, Filter, Clock } from "lucide-react";
import { useAppData } from "@/lib/use-app-data";
import type { AppNotification } from "@/lib/app-data-types";

const typeLabels: Record<AppNotification["type"], { icon: string; label: string; color: string }> = {
  lead: { icon: "📩", label: "Lead", color: "bg-blue-500/20 text-blue-400" },
  performance: { icon: "📊", label: "Performance", color: "bg-amber-500/20 text-amber-400" },
  content: { icon: "📋", label: "Content", color: "bg-purple-500/20 text-purple-400" },
  ads: { icon: "📈", label: "Ads", color: "bg-emerald-500/20 text-emerald-400" },
  hr: { icon: "👤", label: "HR", color: "bg-red-500/20 text-red-400" },
  finance: { icon: "💳", label: "การเงิน", color: "bg-indigo-500/20 text-indigo-400" },
  ticket: { icon: "🎫", label: "Ticket", color: "bg-gray-500/20 text-gray-400" },
  system: { icon: "⚙️", label: "ระบบ", color: "bg-cyan-500/20 text-cyan-400" },
};

const roleFilters = [
  { key: "all" as const, label: "ทั้งหมด" },
  { key: "admin" as const, label: "👩‍💼 Admin" },
  { key: "content" as const, label: "📝 Content" },
  { key: "ads" as const, label: "📈 Ads" },
  { key: "ceo" as const, label: "👔 CEO" },
  { key: "finance" as const, label: "💳 บัญชี" },
];

export default function NotificationsPage() {
  const { payload, loading, error } = useAppData();
  const sourceNotifications = payload?.data.notifications ?? [];
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [notificationsState, setNotificationsState] = useState<AppNotification[] | null>(
    null
  );

  const notifications = notificationsState ?? sourceNotifications;

  if (loading) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const filtered =
    roleFilter === "all"
      ? notifications
      : notifications.filter(
          (n) => n.role === roleFilter || n.role === "all"
        );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const persistNotifications = async (next: AppNotification[]) => {
    setNotificationsState(next);
    await fetch("/api/app-data", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ section: "notifications", value: next }),
    });
  };

  const markAllRead = () => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    void persistNotifications(next);
  };

  const toggleRead = (id: string) => {
    const next = notifications.map((n) =>
      n.id === id ? { ...n, read: !n.read } : n
    );
    void persistNotifications(next);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
            <Bell size={22} className="text-navy-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Notification Hub
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {unreadCount} ใหม่
                </span>
              )}
            </h1>
            <p className="text-xs text-foreground-muted">
              ศูนย์แจ้งเตือนจากทุกฝ่าย — กรองตามบทบาท
            </p>
          </div>
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-navy-800 transition-colors"
        >
          <Check size={14} />
          อ่านทั้งหมด
        </button>
      </div>

      {/* Role Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="text-foreground-muted shrink-0" />
        {roleFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
              roleFilter === f.key
                ? "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                : "bg-navy-800 text-foreground-muted border border-border hover:border-gold-500/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.map((n) => {
          const typeInfo = typeLabels[n.type];
          return (
            <div
              key={n.id}
              onClick={() => toggleRead(n.id)}
              className={`bg-navy-900/50 border border-border rounded-xl p-4 cursor-pointer hover:border-gold-500/20 transition-all ${
                !n.read ? "border-l-2 border-l-gold-500" : "opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3
                      className={`text-sm font-medium truncate ${
                        n.read ? "text-foreground-muted" : "text-foreground"
                      }`}
                    >
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                      <Clock size={10} />
                      {n.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
