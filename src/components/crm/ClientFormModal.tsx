"use client";

import { useState } from "react";
import { X, Trash2, Plus, Minus } from "lucide-react";
import type { 
  ClientProfile, 
  ClientRequirement
} from "@/lib/app-data-types";
import { 
  defaultOnboardingChecklist, 
  defaultOffboardingChecklist,
  serviceProducts 
} from "@/lib/app-utils";
import type { Admin } from "@/lib/app-data-types";

interface Props {
  client?: ClientProfile;
  admins: Admin[];
  onSave: (client: ClientProfile) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const statuses: ClientProfile["status"][] = ["active", "warning", "churning", "offboarding"];

export default function ClientFormModal({ client, admins, onSave, onDelete, onClose }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState({
    name: client?.name ?? "",
    contactPerson: client?.contactPerson ?? "",
    phone: client?.phone ?? "",
    contractStart: client?.contractStart ? new Date(client.contractStart).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    contractEnd: client?.contractEnd ? new Date(client.contractEnd).toISOString().split("T")[0] : new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    monthlyFee: client?.monthlyFee ?? 0,
    adBudget: client?.adBudget ?? 0,
    services: client?.services ?? [],
    status: client?.status ?? ("active" as ClientProfile["status"]),
    assignedAdminIds: client?.assignedAdminIds ?? [],
    salesPersonId: client?.salesPersonId ?? "",
    opLeadId: client?.opLeadId ?? "",
    onboardingComplete: client?.onboardingComplete ?? false,
    npsScore: client?.npsScore,
    retentionPlan: client?.retentionPlan ?? "none",
    offboardingReason: client?.offboardingReason ?? "",
    adBillingType: client?.adBillingType ?? "direct",
    adminAllocatedCost: client?.adminAllocatedCost ?? 0,
    productionAllocatedCost: client?.productionAllocatedCost ?? 10000,
    salesCommissionPercent: client?.salesCommissionPercent ?? 5,
    standardRequirements: client?.standardRequirements ?? {
      targetGroup: "",
      kpiGoal: "",
      brandTone: "",
      mainProcedure: ""
    }
  });

  const [customRequirements, setCustomRequirements] = useState<ClientRequirement[]>(
    client?.customRequirements ?? []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result: ClientProfile = {
      id: client?.id ?? `client-${Date.now()}`,
      ...form,
      customRequirements,
      onboardingChecklists: client?.onboardingChecklists ?? defaultOnboardingChecklist,
      offboardingChecklists: client?.offboardingChecklists ?? defaultOffboardingChecklist,
    };
    onSave(result);
  }

  function toggleService(serviceId: string) {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  }

  function toggleAdmin(adminId: string) {
    setForm(prev => ({
      ...prev,
      assignedAdminIds: prev.assignedAdminIds.includes(adminId)
        ? prev.assignedAdminIds.filter(id => id !== adminId)
        : [...prev.assignedAdminIds, adminId]
    }));
  }

  const inputClass =
    "w-full bg-navy-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-navy-900 border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
            </h2>
            <p className="text-xs text-foreground-muted">จัดการโปรไฟล์และ Requirement ขั้นต้น</p>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={() => {
                  if (confirm("ยืนยันการลบข้อมูลลูกค้านี้?")) {
                    onDelete(client.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="ลบลูกค้า"
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              ข้อมูลพื้นฐาน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ชื่อคลินิก/ธุรกิจ *</label>
                <input
                  required
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น BeautyX Clinic"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ผู้ประสานงาน</label>
                <input
                  className={inputClass}
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="ชื่อลูกค้า"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">เบอร์โทรศัพท์</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08X-XXX-XXXX"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">สถานะ</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Contract & Finance */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              สัญญาและการเงิน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">วันเริ่มสัญญา</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.contractStart}
                  onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">วันสิ้นสุดสัญญา</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.contractEnd}
                  onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ค่าบริการ/เดือน (บาท)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">งบโฆษณา/เดือน (บาท)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.adBudget}
                  onChange={(e) => setForm({ ...form, adBudget: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </section>

          {/* P&L Configuration (New) */}
          <section className="px-4 py-4 bg-gold-500/5 rounded-2xl border border-gold-500/10 space-y-4">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              การจัดการ P&L และต้นทุน (Agency Economics)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-foreground-muted mb-2 block">รูปแบบการชำระค่าโฆษณา</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, adBillingType: "direct" })}
                    className={`flex-1 py-1.5 px-3 rounded-xl border text-[11px] transition-all ${
                      form.adBillingType === "direct"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-navy-800 border-border text-foreground-muted"
                    }`}
                  >
                    ลูกค้าจ่ายตรง (Direct)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, adBillingType: "agency" })}
                    className={`flex-1 py-1.5 px-3 rounded-xl border text-[11px] transition-all ${
                      form.adBillingType === "agency"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-navy-800 border-border text-foreground-muted"
                    }`}
                  >
                    เอเจนซี่สำรองจ่าย (Agency Paid)
                  </button>
                </div>
                <p className="text-[10px] text-foreground-muted mt-1.5 px-1 italic">
                  * หากเลือก "ลูกค้าจ่ายตรง" ค่าแอดจะไม่ถูกนำมาหักลบออกจากกำไรเอเจนซี่
                </p>
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ต้นทุนแอดมิน (Manual/เดือน)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.adminAllocatedCost}
                  onChange={(e) => setForm({ ...form, adminAllocatedCost: parseInt(e.target.value) || 0 })}
                  placeholder="เช่น 10,000"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ต้นทุนทีมผลิต (Fixed Share/เดือน)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.productionAllocatedCost}
                  onChange={(e) => setForm({ ...form, productionAllocatedCost: parseInt(e.target.value) || 0 })}
                  placeholder="เช่น 10,000"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">ค่าคอมมิชชั่นเซลล์ (%)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.salesCommissionPercent}
                  onChange={(e) => setForm({ ...form, salesCommissionPercent: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>
          </section>

          {/* Services & Admins */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              บริการและทีมดูแล
            </h3>
            <div className="space-y-3">
              <label className="text-xs text-foreground-muted block">บริการที่เปิดใช้ (M1 Service Catalog)</label>
              <div className="flex flex-wrap gap-2">
                {serviceProducts.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      form.services.includes(svc.id)
                        ? "bg-gold-500/20 text-gold-400 border-gold-500/30 font-semibold"
                        : "bg-navy-800 text-foreground-muted border-border hover:bg-navy-700 font-medium"
                    }`}
                  >
                    {svc.icon} {svc.shortName}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs text-foreground-muted mb-1 block font-semibold text-blue-400">เซลที่ดูแล (Sales)</label>
                <select
                  required
                  className={inputClass}
                  value={form.salesPersonId}
                  onChange={(e) => setForm({ ...form, salesPersonId: e.target.value })}
                >
                  <option value="">เลือกพนักงานขาย</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.avatar} {admin.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block font-semibold text-purple-400">หัวหน้าทีมปฏิบัติการ (Ops Lead)</label>
                <select
                  required
                  className={inputClass}
                  value={form.opLeadId}
                  onChange={(e) => setForm({ ...form, opLeadId: e.target.value })}
                >
                  <option value="">เลือก Ops Lead</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.avatar} {admin.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <label className="text-xs text-foreground-muted block">แอดมินที่มอบหมาย (Shared Pool)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {admins.map(admin => (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => toggleAdmin(admin.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] border transition-all ${
                      form.assignedAdminIds.includes(admin.id)
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-navy-800 text-foreground-muted border-border hover:bg-navy-700"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-navy-600 flex items-center justify-center text-[8px] font-bold">
                      {admin.avatar}
                    </div>
                    {admin.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Requirement Hub (New) */}
          <section className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                Requirement Hub
              </div>
              <button
                type="button"
                onClick={() => setCustomRequirements([...customRequirements, { id: `r-${Date.now()}`, category: "ทั่วไป", question: "คำถามใหม่", answer: "", filledAt: "" }])}
                className="text-[10px] bg-navy-800 hover:bg-navy-700 px-2 py-1 rounded border border-border flex items-center gap-1 transition-colors"
              >
                <Plus size={10} /> เพิ่มข้อกำหนด
              </button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">กลุ่มเป้าหมาย (Fixed)</label>
                <input
                  required
                  className={inputClass}
                  value={form.standardRequirements.targetGroup}
                  onChange={(e) => setForm({ 
                    ...form, 
                    standardRequirements: { ...form.standardRequirements, targetGroup: e.target.value } 
                  })}
                  placeholder="เช่น ผู้หญิงรายได้สูง 25-45 ปี"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">KPI Goal (Fixed)</label>
                <input
                  required
                  className={inputClass}
                  value={form.standardRequirements.kpiGoal}
                  onChange={(e) => setForm({ 
                    ...form, 
                    standardRequirements: { ...form.standardRequirements, kpiGoal: e.target.value } 
                  })}
                  placeholder="เช่น 100 Lead / เดือน"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">Brand Tone (Fixed)</label>
                <input
                  required
                  className={inputClass}
                  value={form.standardRequirements.brandTone}
                  onChange={(e) => setForm({ 
                    ...form, 
                    standardRequirements: { ...form.standardRequirements, brandTone: e.target.value } 
                  })}
                  placeholder="เช่น หรูหรา พรีเมียม"
                />
              </div>
              <div>
                <label className="text-xs text-foreground-muted mb-1 block">หัตถการ/บริการหลัก (Fixed)</label>
                <input
                  required
                  className={inputClass}
                  value={form.standardRequirements.mainProcedure}
                  onChange={(e) => setForm({ 
                    ...form, 
                    standardRequirements: { ...form.standardRequirements, mainProcedure: e.target.value } 
                  })}
                  placeholder="เช่น Botox, Filler"
                />
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>ข้อกำหนดเพิ่มเติม (Add-ons)</span>
                <button
                  type="button"
                  onClick={() => setCustomRequirements([...customRequirements, { id: `r-${Date.now()}`, category: "ทั่วไป", question: "คำถามใหม่", answer: "", filledAt: "" }])}
                  className="bg-navy-800 hover:bg-navy-700 px-2 py-0.5 rounded border border-border flex items-center gap-1 transition-colors"
                >
                  <Plus size={10} /> เพิ่ม
                </button>
              </h4>
              <div className="space-y-3">
                {customRequirements.map((req, idx) => (
                  <div key={req.id} className="bg-navy-850 p-4 rounded-xl border border-border/50 space-y-3 relative group">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        className={`${inputClass} !bg-navy-900`}
                        value={req.category}
                        onChange={(e) => {
                          const newReqs = [...customRequirements];
                          newReqs[idx].category = e.target.value;
                          setCustomRequirements(newReqs);
                        }}
                        placeholder="หมวดหมู่"
                      />
                      <input
                        className={`${inputClass} !bg-navy-900`}
                        value={req.question}
                        onChange={(e) => {
                          const newReqs = [...customRequirements];
                          newReqs[idx].question = e.target.value;
                          setCustomRequirements(newReqs);
                        }}
                        placeholder="คำถาม/หัวข้อ"
                      />
                    </div>
                    <textarea
                      className={`${inputClass} !bg-navy-900 resize-none`}
                      rows={2}
                      value={req.answer}
                      onChange={(e) => {
                        const newReqs = [...customRequirements];
                        newReqs[idx].answer = e.target.value;
                        newReqs[idx].filledAt = new Date().toISOString();
                        setCustomRequirements(newReqs);
                      }}
                      placeholder="คำตอบ/รายละเอียด..."
                    />
                    <button
                      type="button"
                      onClick={() => setCustomRequirements(customRequirements.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-red-500/30"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </form>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-navy-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-8 py-2 bg-gold-400 text-navy-950 rounded-xl text-sm font-bold hover:bg-gold-500 transition-all shadow-lg shadow-gold-500/20"
          >
            {isEdit ? "บันทึกข้อมูล" : "สร้างโปรไฟล์ลูกค้า"}
          </button>
        </div>
      </div>
    </div>
  );
}
