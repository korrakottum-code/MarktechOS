"use client";

import { useState } from "react";
import {
  mockTickets,
  getTicketStats,
  getCategoryLabel,
  getCategoryColor,
  getTicketPriorityLabel,
  getTicketPriorityColor,
  getTicketStatusColor,
  getTicketStatusLabel,
  TicketCategory,
  TicketStatus,
} from "@/lib/mock-tickets";
import {
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Shield,
} from "lucide-react";

export default function TicketingPage() {
  const stats = getTicketStats();
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockTickets
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.createdBy.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statCards = [
    {
      label: "Ticket ทั้งหมด",
      value: stats.total.toString(),
      sub: `${stats.open} เปิดอยู่`,
      icon: Ticket,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "กำลังดำเนินการ",
      value: stats.inProgress.toString(),
      sub: "In Progress",
      icon: Clock,
      color: "text-amber-400",
      bg: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "SLA Rate",
      value: `${stats.slaRate}%`,
      sub: stats.slaRate >= 90 ? "ดีเยี่ยม!" : `${stats.slaBreached} Breached`,
      icon: Shield,
      color: stats.slaRate >= 90 ? "text-emerald-400" : "text-red-400",
      bg: stats.slaRate >= 90 ? "from-emerald-500/20 to-emerald-500/5" : "from-red-500/20 to-red-500/5",
    },
    {
      label: "แก้ไขแล้ว",
      value: stats.resolved.toString(),
      sub: `จาก ${stats.total} ทั้งหมด`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  const categories: { value: TicketCategory | "all"; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "hr", label: "👤 HR" },
    { value: "it", label: "💻 IT" },
    { value: "ops", label: "⚙️ Ops" },
    { value: "finance", label: "💰 การเงิน" },
    { value: "general", label: "📋 ทั่วไป" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🎫 Ticketing Hub
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
              Module 6
            </span>
          </h1>
          <p className="text-foreground-muted mt-1">
            ระบบจัดการคำร้อง — HR, IT, Ops, การเงิน พร้อม SLA Tracking
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-navy-950 rounded-xl font-medium text-sm hover:bg-gold-400 transition-colors">
          <Plus size={18} />
          สร้าง Ticket ใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-foreground-muted">{card.label}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Ticket List */}
      <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              📋 รายการ Ticket
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-navy-800 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50 w-36"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-navy-800 rounded-lg p-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`px-2 py-1 rounded-md text-xs transition-colors ${
                      categoryFilter === cat.value
                        ? "bg-gold-500/20 text-gold-400"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-muted border-b border-border">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">หัวข้อ</th>
                <th className="px-6 py-3 font-medium">หมวด</th>
                <th className="px-6 py-3 font-medium text-center">ความสำคัญ</th>
                <th className="px-6 py-3 font-medium text-center">สถานะ</th>
                <th className="px-6 py-3 font-medium">ผู้แจ้ง</th>
                <th className="px-6 py-3 font-medium">รับผิดชอบ</th>
                <th className="px-6 py-3 font-medium text-center">SLA</th>
                <th className="px-6 py-3 font-medium text-right">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket, i) => {
                const hoursElapsed = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 3600000);
                return (
                  <tr
                    key={ticket.id}
                    className={`border-b border-border/30 hover:bg-navy-800/50 transition-colors cursor-pointer ${
                      ticket.slaBreached ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-mono text-foreground-muted text-xs">
                      {ticket.id}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground">{ticket.title}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg ${getCategoryColor(ticket.category)}`}>
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs ${getTicketPriorityColor(ticket.priority)}`}>
                        {getTicketPriorityLabel(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-lg ${getTicketStatusColor(ticket.status)}`}>
                        {getTicketStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-foreground">{ticket.createdBy}</td>
                    <td className="px-6 py-3 text-foreground-muted">{ticket.assignedTo}</td>
                    <td className="px-6 py-3 text-center">
                      {ticket.slaBreached ? (
                        <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 font-medium">
                          ⏰ Breached
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                          ✅ On Track
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-foreground-muted text-xs">
                      {hoursElapsed < 24
                        ? `${hoursElapsed} ชม.`
                        : `${Math.floor(hoursElapsed / 24)} วัน`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
