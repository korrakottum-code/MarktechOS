"use client";

import { useState, useEffect } from "react";
import {
  getCategoryLabel,
  getCategoryColor,
  getTicketPriorityLabel,
  getTicketPriorityColor,
  getTicketStatusColor,
  getTicketStatusLabel,
} from "@/lib/app-utils";
import type { TicketCategory, Ticket as TicketType } from "@/lib/app-data-types";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import TicketFormModal from "@/components/ticketing/TicketFormModal";
// Duplicate import removed, TicketType already imported above
import {
  Ticket,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Shield,
  AlertTriangle,
} from "lucide-react";

export default function TicketingPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const stats = payload?.stats.tickets;
  const tickets = (payload?.data.tickets ?? []) as TicketType[];

  // SLA Engine: Monitor and flag breaches
  useEffect(() => {
    if (loading || !tickets.length) return;

    let hasChange = false;
    const now = new Date().getTime();

    const checkedTickets = tickets.map(ticket => {
      if (ticket.status === "resolved" || ticket.status === "closed" || ticket.slaBreached) {
        return ticket;
      }

      const created = new Date(ticket.createdAt).getTime();
      const hoursAgo = (now - created) / (1000 * 60 * 60);
      const threshold = ticket.category === "crisis" ? 2 : 24;

      if (hoursAgo > threshold) {
        hasChange = true;
        return { ...ticket, slaBreached: true };
      }
      return ticket;
    });

    if (hasChange) {
      console.log("SLA Engine: Detected new breaches, syncing to SQL...");
      patchSection("tickets", checkedTickets);
    }
  }, [loading, tickets, patchSection]);

  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [ticketModal, setTicketModal] = useState<{ open: boolean; ticket?: TicketType }>({ open: false });

  function handleSaveTicket(ticket: TicketType) {
    const existing = tickets.find((t) => t.id === ticket.id);
    const updated = existing
      ? tickets.map((t) => (t.id === ticket.id ? ticket : t))
      : [...tickets, ticket];
    patchSection("tickets", updated);
    setTicketModal({ open: false });
  }

  function handleDeleteTicket(id: string) {
    const updated = tickets.filter((t) => t.id !== id);
    patchSection("tickets", updated);
    setTicketModal({ open: false });
  }

  if (loading || !stats) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const filtered = tickets
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
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
    { value: "crisis", label: "🚨 Crisis (V2)" },
  ];

  const activeCrises = tickets.filter(t => t.category === "crisis" && t.status !== "resolved" && t.status !== "closed");

  return (
    <div className="space-y-6">
      {ticketModal.open && (
        <TicketFormModal
          ticket={ticketModal.ticket}
          ticketCount={tickets.length}
          onSave={handleSaveTicket}
          onClose={() => setTicketModal({ open: false })}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
              Module 6
            </span>
            <span className="text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
              Phase 4.5: Crisis & Escalation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Ticketing & Crisis Hub
          </h1>
          <p className="text-foreground-muted mt-1">
            ระบบจัดการคำร้อง — HR, IT, Ops, การเงิน พร้อม SLA Tracking
          </p>
        </div>
        <button
          onClick={() => setTicketModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-navy-950 rounded-xl font-medium text-sm hover:bg-gold-400 transition-colors"
        >
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

      {/* Active Crisis Section (V2 Workflow) */}
      {activeCrises.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl overflow-hidden mb-6">
          <div className="bg-red-500/20 px-6 py-4 flex items-center justify-between border-b border-red-500/30">
            <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              🚨 Active Crisis Escalations
            </h2>
            <span className="text-xs font-mono font-medium text-red-400 bg-red-500/20 px-3 py-1 rounded-full">
              SLA &lt; 2 Hrs
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCrises.map((crisis) => (
              <div 
                key={crisis.id} 
                onClick={() => setTicketModal({ open: true, ticket: crisis })}
                className="bg-navy-900 border border-red-500/30 rounded-xl p-4 cursor-pointer hover:border-red-400/50 transition-colors shadow-lg shadow-red-500/5 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-red-400/70">{crisis.id} • {crisis.assignedTo}</p>
                    <h3 className="text-red-400 font-semibold">{crisis.title}</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-1 rounded-md">
                    {getTicketPriorityLabel(crisis.priority)}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xs text-foreground-muted bg-navy-800 px-2 py-1 rounded-lg">
                    {getTicketStatusLabel(crisis.status)}
                  </span>
                  <span className={`text-xs font-medium ${crisis.slaBreached ? "text-red-500 animate-pulse" : "text-amber-400"}`}>
                    ⏰ {crisis.slaBreached ? "SLA Breached!" : "SLA Tracking..."}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              {filtered.map((ticket) => {
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setTicketModal({ open: true, ticket })}
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
                      {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
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
