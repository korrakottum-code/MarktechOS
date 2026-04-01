"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { Lead, Admin } from "@/lib/app-data-types";

interface Props {
  lead?: Lead;
  admins: Admin[];
  onSave: (lead: Lead) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const channels: { value: Lead["channel"]; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "line", label: "LINE" },
  { value: "website", label: "Website" },
];

const statuses: { value: Lead["status"]; label: string }[] = [
  { value: "new", label: "ใหม่" },
  { value: "contacted", label: "ติดต่อแล้ว" },
  { value: "negotiating", label: "เจรจา" },
  { value: "closed", label: "ปิดการขาย" },
  { value: "lost", label: "สูญเสีย" },
];

export default function LeadFormModal({ lead, admins, onSave, onDelete, onClose }: Props) {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    channel: lead?.channel ?? ("facebook" as Lead["channel"]),
    clinic: lead?.clinic ?? "",
    procedure: lead?.procedure ?? "",
    status: lead?.status ?? ("new" as Lead["status"]),
    assignedTo: lead?.assignedTo ?? (admins[0]?.id ?? ""),
    value: lead?.value ?? 0,
    notes: lead?.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result: Lead = {
      id: lead?.id ?? `lead-${Date.now()}`,
      createdAt: lead?.createdAt ?? new Date().toISOString(),
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
            {isEdit ? "แก้ไข Lead" : "สร้าง Lead ใหม่"}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={() => {
                  if (confirm("ยืนยันการลบ Lead นี้?")) {
                    onDelete(lead.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="ลบ Lead"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ชื่อลูกค้า *</label>
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">เบอร์โทร</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08x-xxx-xxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ช่องทาง</label>
              <select
                className={inputClass}
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as Lead["channel"] })}
              >
                {channels.map((ch) => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">สถานะ</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Lead["status"] })}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">คลินิก *</label>
              <input
                required
                className={inputClass}
                value={form.clinic}
                onChange={(e) => setForm({ ...form, clinic: e.target.value })}
                placeholder="ชื่อคลินิก"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">หัตถการ</label>
              <input
                className={inputClass}
                value={form.procedure}
                onChange={(e) => setForm({ ...form, procedure: e.target.value })}
                placeholder="เช่น โบท็อกซ์, ฟิลเลอร์"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">แอดมินรับผิดชอบ</label>
              <select
                className={inputClass}
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">มูลค่า (฿)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-foreground-muted mb-1 block">หมายเหตุ</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
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
              {isEdit ? "บันทึก" : "สร้าง Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
