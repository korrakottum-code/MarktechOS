"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { SalesDeal, DealStage } from "@/lib/app-data-types";
import { 
  serviceProducts, 
  getDealStageLabel 
} from "@/lib/app-utils";
import MarkTechDatePicker from "../ui/DatePicker";

interface Props {
  deal?: SalesDeal;
  onSave: (deal: SalesDeal) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const stages: DealStage[] = [
  "prospect",
  "contacted",
  "demo",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const businessTypes = [
  "คลินิกความงาม",
  "คลินิกทันตกรรม",
  "สปา",
  "ร้านอาหาร",
  "อื่นๆ",
];

export default function DealFormModal({ deal, onSave, onDelete, onClose }: Props) {
  const isEdit = !!deal;
  const [form, setForm] = useState({
    businessName: deal?.businessName ?? "",
    contactPerson: deal?.contactPerson ?? "",
    phone: deal?.phone ?? "",
    businessType: deal?.businessType ?? "คลินิกความงาม",
    services: deal?.services ?? [],
    dealValue: deal?.dealValue ?? 0,
    stage: deal?.stage ?? ("prospect" as DealStage),
    probability: deal?.probability ?? 10,
    salesperson: deal?.salesperson ?? "",
    expectedClose: deal?.expectedClose ? new Date(deal.expectedClose).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    notes: deal?.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result: SalesDeal = {
      id: deal?.id ?? `deal-${Date.now()}`,
      createdAt: deal?.createdAt ?? new Date().toISOString(),
      ...form,
      expectedClose: new Date(form.expectedClose).toISOString(),
    };
    onSave(result);
  }

  const toggleService = (svcId: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(svcId)
        ? prev.services.filter((id) => id !== svcId)
        : [...prev.services, svcId],
    }));
  };

  const inputClass =
    "w-full bg-navy-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-900 border border-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "แก้ไข Deal" : "สร้าง Deal ใหม่"}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={() => {
                  if (confirm("ยืนยันการลบ Deal นี้?")) {
                    onDelete(deal.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="ลบ Deal"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ชื่อธุรกิจ *</label>
              <input
                required
                className={inputClass}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="ชื่อคลินิก / บริษัท"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ประเภทธุรกิจ</label>
              <select
                className={inputClass}
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              >
                {businessTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ผู้ติดต่อ *</label>
              <input
                required
                className={inputClass}
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="ชื่อผู้ติดต่อ"
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

          <div>
            <label className="text-xs text-foreground-muted mb-2 block">บริการที่สนใจ</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {serviceProducts.map((svc) => (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    form.services.includes(svc.id)
                      ? "bg-gold-500/10 border-gold-500/50 text-gold-400"
                      : "bg-navy-800 border-border text-foreground-muted hover:border-border-hover hover:bg-navy-750"
                  }`}
                >
                  <div className="text-xl mb-1">{svc.icon}</div>
                  <div className="text-xs font-medium">{svc.shortName}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-foreground-muted mb-1 block">Stage</label>
              <select
                className={inputClass}
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
              >
                {stages.map((s) => (
                  <option key={s} value={s}>{getDealStageLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">โอกาสปิด (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">มูลค่า (฿)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.dealValue}
                onChange={(e) => setForm({ ...form, dealValue: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">พนักงานขาย (Sale)</label>
              <input
                className={inputClass}
                value={form.salesperson}
                onChange={(e) => setForm({ ...form, salesperson: e.target.value })}
                placeholder="ชื่อพนักงานขาย"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block font-bold uppercase tracking-widest text-[10px]">คาดว่าจะปิด</label>
              <MarkTechDatePicker
                mode="single"
                value={form.expectedClose ? new Date(form.expectedClose) : new Date()}
                onChange={(date: Date) => setForm(p => ({ ...p, expectedClose: date.toISOString().split('T')[0] }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-foreground-muted mb-1 block">หมายเหตุ</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20"
            >
              {isEdit ? "บันทึกการเปลี่ยนแปลง" : "สร้าง Deal ใหม่"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
