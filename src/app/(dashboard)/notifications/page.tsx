"use client";

import { useState } from "react";
import { Bell, Check, Filter, Clock } from "lucide-react";

type NotifType = "lead" | "performance" | "content" | "ads" | "hr" | "finance" | "ticket" | "system";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  role: "admin" | "content" | "ads" | "am" | "ceo" | "finance" | "all";
}

const typeLabels: Record<NotifType, { icon: string; label: string; color: string }> = {
  lead: { icon: "📩", label: "Lead", color: "bg-blue-500/20 text-blue-400" },
  performance: { icon: "📊", label: "Performance", color: "bg-amber-500/20 text-amber-400" },
  content: { icon: "📋", label: "Content", color: "bg-purple-500/20 text-purple-400" },
  ads: { icon: "📈", label: "Ads", color: "bg-emerald-500/20 text-emerald-400" },
  hr: { icon: "👤", label: "HR", color: "bg-red-500/20 text-red-400" },
  finance: { icon: "💳", label: "การเงิน", color: "bg-indigo-500/20 text-indigo-400" },
  ticket: { icon: "🎫", label: "Ticket", color: "bg-gray-500/20 text-gray-400" },
  system: { icon: "⚙️", label: "ระบบ", color: "bg-cyan-500/20 text-cyan-400" },
};

const mockNotifications: Notification[] = [
  { id: "n1", type: "lead", title: "Lead ใหม่ 3 รายการ", message: "คุณแอน, คุณเบล, คุณมิ้นท์ สนใจ Botox จาก Facebook", time: "2 นาทีที่แล้ว", read: false, role: "admin" },
  { id: "n2", type: "lead", title: "Lead #127 ยังไม่ถูกตอบ", message: "สมหญิง ยังไม่ตอบ Lead #127 (เกิน 15 นาที)", time: "15 นาทีที่แล้ว", read: false, role: "admin" },
  { id: "n3", type: "performance", title: "ยอดปิดทีมถึง 38%", message: "Close Rate รวมทีม Admin อยู่ที่ 38% — ใกล้เป้า 40% แล้ว!", time: "1 ชม. ที่แล้ว", read: false, role: "ceo" },
  { id: "n4", type: "content", title: "งานใหม่: แคปชัน BeautyX", message: "ชิ้นงานแคปชันโปรโมชัน — Deadline: พรุ่งนี้ 12:00", time: "2 ชม. ที่แล้ว", read: false, role: "content" },
  { id: "n5", type: "content", title: "งาน #45 Approve แล้ว", message: "Banner Facebook Glow Up Clinic ได้รับ Approve จากลูกค้า", time: "3 ชม. ที่แล้ว", read: true, role: "content" },
  { id: "n6", type: "ads", title: "ROAS คลินิก Dermis ต่ำ", message: "ROAS ต่ำกว่าเกณฑ์ 3 วันติด — ต้องปรับ Campaign", time: "4 ชม. ที่แล้ว", read: false, role: "ads" },
  { id: "n7", type: "ads", title: "งบแอดเหลือ 20%", message: "BeautyX Clinic งบเหลือ ฿16,000 จาก ฿80,000 — ต้องขอเพิ่ม?", time: "5 ชม. ที่แล้ว", read: true, role: "ads" },
  { id: "n8", type: "hr", title: "PIP: สมหญิง รอบ 2", message: "Close Rate ต่ำกว่า 30% ติดต่อกัน 2 เดือน", time: "6 ชม. ที่แล้ว", read: false, role: "ceo" },
  { id: "n9", type: "hr", title: "ธนิดา มาสาย 5 ครั้ง", message: "มาสายสะสมในเดือนนี้ — เกินกำหนด", time: "8 ชม. ที่แล้ว", read: true, role: "am" },
  { id: "n10", type: "finance", title: "รอบวางบิล BeautyX", message: "วางบิลค่าบริการ + ค่าแอด มี.ค. — ครบกำหนดใน 3 วัน", time: "10 ชม. ที่แล้ว", read: false, role: "finance" },
  { id: "n11", type: "finance", title: "วันจ่ายเงินเดือน", message: "เหลืออีก 1 วัน — ตรวจสอบยอด Commission ให้เรียบร้อย", time: "12 ชม. ที่แล้ว", read: true, role: "finance" },
  { id: "n12", type: "ticket", title: "Ticket ด่วน: Internet ห้อง Meeting", message: "IT Ticket — SLA 2 ชม. กำลังจะเกินกำหนด", time: "14 ชม. ที่แล้ว", read: false, role: "all" },
  { id: "n13", type: "performance", title: "สรุปรายวัน CEO", message: "ปิดการขาย 15 เคส / ยอดรวม ฿245,000 / แอดมิน 2 คนต่ำกว่าเกณฑ์", time: "1 วันที่แล้ว", read: true, role: "ceo" },
  { id: "n14", type: "system", title: "Backup สำเร็จ", message: "Daily Backup เวลา 03:00 น. เสร็จสมบูรณ์", time: "1 วันที่แล้ว", read: true, role: "all" },
];

const roleFilters = [
  { key: "all" as const, label: "ทั้งหมด" },
  { key: "admin" as const, label: "👩‍💼 Admin" },
  { key: "content" as const, label: "📝 Content" },
  { key: "ads" as const, label: "📈 Ads" },
  { key: "ceo" as const, label: "👔 CEO" },
  { key: "finance" as const, label: "💳 บัญชี" },
];

export default function NotificationsPage() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [notifications, setNotifications] = useState(mockNotifications);

  const filtered =
    roleFilter === "all"
      ? notifications
      : notifications.filter(
          (n) => n.role === roleFilter || n.role === "all"
        );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
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
