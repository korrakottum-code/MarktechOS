"use client";

import type { Admin } from "@/lib/app-data-types";
import { useState, useEffect } from "react";
import { User, Shield, Target, Plus, Trash2, Calendar, Landmark, CreditCard, Banknote, PhoneCall } from "lucide-react";
import SideDrawer from "../ui/SideDrawer";
import MarkTechDatePicker from "../ui/DatePicker";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (admin: Admin) => void;
  onDelete?: (id: string) => void;
  admin?: Admin | null;
}

const AVATARS = ["👩‍💼", "👨‍💼", "👩‍💻", "👨‍💻", "👩‍🎨", "👨‍🎨", "🧑", "🧔", "🦊", "🦁", "🐧"];

export default function StaffFormModal({ open, onClose, onSave, onDelete, admin }: Props) {
  const [formData, setFormData] = useState<Partial<Admin>>({
    name: "",
    role: "admin",
    avatar: "👩‍💼",
    status: "online",
    revenue: 0,
    leadsReceived: 0,
    leadsClosed: 0,
    closeRate: 0,
    avgResponseTime: 5,
    tier: "none",
    salary: 10000,
    startDate: new Date().toISOString().split('T')[0],
    bankName: "",
    bankAccount: "",
  });

  useEffect(() => {
    if (admin) {
      setFormData(admin);
    } else {
      setFormData({
        name: "",
        role: "admin",
        avatar: "👩‍💼",
        status: "online",
        revenue: 0,
        leadsReceived: 0,
        leadsClosed: 0,
        closeRate: 0,
        avgResponseTime: 5,
        tier: "none",
        salary: 10000,
        startDate: new Date().toISOString().split('T')[0],
        bankName: "",
        bankAccount: "",
      });
    }
  }, [admin, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData as Admin,
      id: admin?.id || `admin-${Date.now()}`,
    });
  };

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {admin && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(admin.id)}
          className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Trash2 size={18} /> ลบพนักงาน
        </button>
      )}
      <div className="flex-1" />
      <button
        type="submit"
        form="staff-form"
        className="px-8 py-2.5 rounded-xl bg-gold-500 text-navy-950 font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 flex items-center gap-2"
      >
        <Plus size={18} /> {admin ? "บันทึกข้อมูล" : "สร้างพนักงาน"}
      </button>
    </div>
  );

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={admin ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากรใหม่เข้าสู่ MarkTech OS"}
      subtitle={admin ? `กำลังแก้ไข: ${admin.name}` : "ลงทะเบียนพนักงานใหม่พร้อมกำหนดบทบาทและเป้าหมาย"}
      footer={footer}
    >
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-8 pb-10">
        {/* Section: Identity */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gold-400 uppercase tracking-[0.2em] border-b border-gold-500/20 pb-2">
            ข้อมูลประจำตัว (Identity)
          </h3>
          
          <div className="flex flex-col gap-4">
             <div className="space-y-2">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">เลือก Avatar ประจำตัว</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(avatar => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, avatar }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all ${
                      formData.avatar === avatar ? 'bg-gold-500/20 border-gold-500' : 'bg-navy-950 border-border/50 hover:border-gold-500/30'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <User size={12} className="text-gold-400" /> ชื่อ-นามสกุล
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none transition-all"
                  placeholder="เช่น มยุรี (Admin)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Shield size={12} className="text-gold-400" /> ตำแหน่ง (Role)
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}
                  className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
                >
                  <option value="admin">Admin (Page Admin)</option>
                  <option value="sale">Sale (Business Development)</option>
                  <option value="operator">Operator (System Ops)</option>
                  <option value="content">Content & Creative</option>
                  <option value="ads opt">Ads Optimizer</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Professional HR Info */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gold-400 uppercase tracking-[0.2em] border-b border-gold-500/20 pb-2">
            ข้อมูลการจ้างงาน (Employment)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Banknote size={12} /> เงินเดือนพื้นฐาน
              </label>
              <input
                type="number"
                value={formData.salary}
                onChange={e => setFormData(p => ({ ...p, salary: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Calendar size={12} /> วันเริ่มงาน
              </label>
              <MarkTechDatePicker
                mode="single"
                value={formData.startDate ? new Date(formData.startDate) : new Date()}
                onChange={(date: Date) => setFormData(p => ({ ...p, startDate: date.toISOString().split('T')[0] }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Landmark size={12} /> ธนาคาร
              </label>
              <select
                value={formData.bankName}
                onChange={e => setFormData(p => ({ ...p, bankName: e.target.value }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              >
                <option value="">เลือกธนาคาร</option>
                <option value="Kasikorn">กสิกรไทย (K-Bank)</option>
                <option value="SCB">ไทยพาณิชย์ (SCB)</option>
                <option value="Bangkok Bank">กรุงเทพ (BBL)</option>
                <option value="Krung Thai">กรุงไทย (KTB)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <CreditCard size={12} /> เลขที่บัญชี
              </label>
              <input
                value={formData.bankAccount}
                onChange={e => setFormData(p => ({ ...p, bankAccount: e.target.value }))}
                placeholder="000-0-00000-0"
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section: Performance Targets */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gold-400 uppercase tracking-[0.2em] border-b border-gold-500/20 pb-2">
            เป้าหมายและผลงาน (KPIs)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Target size={12} /> เป้ารายได้ (ปิดการขาย)
              </label>
              <input
                type="number"
                value={formData.revenue}
                onChange={e => setFormData(p => ({ ...p, revenue: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Shield size={12} /> อัตราการปิดเกณฑ์ (%)
              </label>
              <input
                type="number"
                max="100"
                value={formData.closeRate}
                onChange={e => setFormData(p => ({ ...p, closeRate: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
          </div>

          {formData.role === 'ads opt' && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">ROAS Target (Ads Optimizer)</label>
              <input
                type="number"
                step="0.1"
                value={formData.roas || 0}
                onChange={e => setFormData(p => ({ ...p, roas: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
          )}

          {formData.role === 'sale' && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">Pipeline Value (Sales)</label>
              <input
                type="number"
                value={formData.pipelineValue || 0}
                onChange={e => setFormData(p => ({ ...p, pipelineValue: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold-500 outline-none"
              />
            </div>
          )}
        </div>
      </form>
    </SideDrawer>
  );
}
