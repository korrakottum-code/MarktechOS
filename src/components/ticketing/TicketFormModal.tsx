"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "@/lib/app-data-types";

interface Props {
  ticket?: Ticket;
  ticketCount: number;
  onSave: (ticket: Ticket) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const categories: { value: TicketCategory; label: string }[] = [
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
  { value: "ops", label: "Ops" },
  { value: "finance", label: "การเงิน" },
  { value: "general", label: "ทั่วไป" },
];

const priorities: { value: TicketPriority; label: string }[] = [
  { value: "urgent", label: "เร่งด่วน" },
  { value: "high", label: "สูง" },
  { value: "medium", label: "ปานกลาง" },
  { value: "low", label: "ต่ำ" },
];

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "เปิด" },
  { value: "in-progress", label: "กำลังดำเนินการ" },
  { value: "resolved", label: "แก้ไขแล้ว" },
  { value: "closed", label: "ปิด" },
];

const slaDefaults: Record<TicketPriority, number> = {
  urgent: 4,
  high: 8,
  medium: 24,
  low: 48,
};

export default function TicketFormModal({ ticket, ticketCount, onSave, onDelete, onClose }: Props) {
  const isEdit = !!ticket;
  const [form, setForm] = useState({
    title: ticket?.title ?? "",
    description: ticket?.description ?? "",
    category: ticket?.category ?? ("general" as TicketCategory),
    priority: ticket?.priority ?? ("medium" as TicketPriority),
    status: ticket?.status ?? ("open" as TicketStatus),
    createdBy: ticket?.createdBy ?? "",
    assignedTo: ticket?.assignedTo ?? "",
    slaHours: ticket?.slaHours ?? slaDefaults.medium,
  });

  function handlePriorityChange(priority: TicketPriority) {
    setForm((prev) => ({
      ...prev,
      priority,
      slaHours: prev.slaHours === slaDefaults[prev.priority] ? slaDefaults[priority] : prev.slaHours,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const result: Ticket = {
      id: ticket?.id ?? `TK-${String(ticketCount + 1).padStart(3, "0")}`,
      createdAt: ticket?.createdAt ?? now,
      updatedAt: now,
      slaBreached: ticket?.slaBreached ?? false,
      ...form,
    };
    onSave(result);
  }

  const inputClass =
    "w-full bg-navy-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-900 border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? `แก้ไข ${ticket.id}` : "สร้าง Ticket ใหม่"}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={() => {
                  if (confirm("ยืนยันการลบ Ticket นี้?")) {
                    onDelete(ticket.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="ลบ Ticket"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-navy-800 transition-colors"
            >
              <X size={18} className="text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">หัวข้อ *</label>
            <input
              required
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ระบุหัวข้อ Ticket"
            />
          </div>

          <div>
            <label className="text-xs text-foreground-muted mb-1 block">รายละเอียด</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="อธิบายรายละเอียดปัญหา..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">หมวดหมู่</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ความสำคัญ</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">สถานะ</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TicketStatus })}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">SLA (ชั่วโมง)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.slaHours}
                onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ผู้แจ้ง *</label>
              <input
                required
                className={inputClass}
                value={form.createdBy}
                onChange={(e) => setForm({ ...form, createdBy: e.target.value })}
                placeholder="ชื่อผู้แจ้ง"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ผู้รับผิดชอบ</label>
              <input
                className={inputClass}
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                placeholder="ชื่อผู้รับผิดชอบ"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              {isEdit ? "บันทึก" : "สร้าง Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
