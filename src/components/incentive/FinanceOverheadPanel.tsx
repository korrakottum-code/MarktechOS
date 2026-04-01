"use client";

import { formatCurrency } from "@/lib/app-utils";
import type { FinanceSettings } from "@/lib/app-data-types";
import { Building2, Users2, Cpu, Save } from "lucide-react";
import { useState } from "react";

interface Props {
  settings: FinanceSettings;
  onSave: (settings: FinanceSettings) => void;
}

export default function FinanceOverheadPanel({ settings, onSave }: Props) {
  const [form, setForm] = useState<FinanceSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);

  function handleChange(key: keyof FinanceSettings, value: number) {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function handleSave() {
    onSave(form);
    setIsDirty(false);
  }

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-border bg-navy-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            🏢 Company Overhead & Fixed Costs
          </h3>
          <p className="text-[11px] text-foreground-muted mt-0.5">
            ตั้งค่าต้นทุนคงที่รายเดือนของบริษัท เพื่อคำนวณกำไรสุทธิ (Net Profit)
          </p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 bg-gold-400 text-navy-950 rounded-lg text-xs font-bold hover:bg-gold-500 transition-all"
          >
            <Save size={14} /> บันทึกการตั้งค่า
          </button>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ads Opt Team Salary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gold-400">
            <Cpu size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Ads Opt Team</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-foreground-muted uppercase">เงินเดือนรวมทีม Ads Opt / เดือน</label>
            <div className="relative font-mono">
              <input
                type="number"
                value={form.adsOptTeamTotalSalary}
                onChange={(e) => handleChange("adsOptTeamTotalSalary", parseInt(e.target.value) || 0)}
                className="w-full bg-navy-850 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold-500/50"
              />
              <span className="absolute right-3 top-2 text-[10px] text-foreground-muted">THB</span>
            </div>
            <p className="text-[9px] text-foreground-muted italic">
              * ยอดนี้จะถูกนำไปหารเฉลี่ยให้คลินิกแต่ละแห่งใน P&L
            </p>
          </div>
        </div>

        {/* Office Overhead */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Building2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Office & G&A</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-foreground-muted uppercase">ค่าเช่า + น้ำไฟ + อื่นๆ / เดือน</label>
            <div className="relative font-mono">
              <input
                type="number"
                value={form.totalOfficeOverhead}
                onChange={(e) => handleChange("totalOfficeOverhead", parseInt(e.target.value) || 0)}
                className="w-full bg-navy-850 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold-500/50"
              />
              <span className="absolute right-3 top-2 text-[10px] text-foreground-muted">THB</span>
            </div>
          </div>
        </div>

        {/* General Ops Salary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Users2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">General Ops Team</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-foreground-muted uppercase">เงินเดือนทีมหลังบ้าน (Shared)</label>
            <div className="relative font-mono">
              <input
                type="number"
                value={form.generalOpsFixedSalary}
                onChange={(e) => handleChange("generalOpsFixedSalary", parseInt(e.target.value) || 0)}
                className="w-full bg-navy-850 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold-500/50"
              />
              <span className="absolute right-3 top-2 text-[10px] text-foreground-muted">THB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-navy-950/50 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-foreground-muted uppercase font-bold">Total Monthly Fixed Exposure</span>
        <span className="text-sm font-mono font-bold text-red-400">
          -{formatCurrency(form.adsOptTeamTotalSalary + form.totalOfficeOverhead + form.generalOpsFixedSalary)}
        </span>
      </div>
    </div>
  );
}
