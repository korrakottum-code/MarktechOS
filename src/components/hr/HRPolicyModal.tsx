"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Clock, TrendingDown, BellRing, Save } from "lucide-react";
import SideDrawer from "../ui/SideDrawer";
import type { HRPolicy } from "@/lib/app-data-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (policy: HRPolicy) => void;
  initialPolicy?: HRPolicy;
}

export default function HRPolicyModal({ open, onClose, onSave, initialPolicy }: Props) {
  const [policy, setPolicy] = useState<HRPolicy>({
    lateThreshold: 5,
    absentThreshold: 3,
    closeRatePipThreshold: 30,
    responseTimeSla: 15,
    autoEscalateToCeo: true,
  });

  useEffect(() => {
    if (initialPolicy) setPolicy(initialPolicy);
  }, [initialPolicy, open]);

  const footer = (
    <div className="flex gap-3 w-full">
      <button
        onClick={onClose}
        className="flex-1 py-2.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-navy-800 transition-all text-sm font-medium"
      >
        ยกเลิก
      </button>
      <button
        form="hr-policy-form"
        type="submit"
        className="flex-[2] py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 text-sm"
      >
        <Save size={18} /> บันทึกนโยบาย
      </button>
    </div>
  );

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="HR Risk & Compliance Policy"
      subtitle="กำหนดเกณฑ์มาตรฐาน (Thresholds) สำหรับระบบแจ้งเตือนอัตโนมัติ"
      footer={footer}
    >
      <form 
        id="hr-policy-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(policy);
        }}
        className="space-y-8"
      >
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3 items-start">
          <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
          <p className="text-[11px] text-red-200/70 leading-relaxed italic">
            การปรับเปลี่ยนเกณฑ์เหล่านี้จะมีผลต่อการสร้างรายการแจ้งเตือนในระบบ HR Warning System ทันที และอาจส่งผลต่อการประเมินรอบเงินเดือนพนักงาน
          </p>
        </div>

        <div className="space-y-6">
          {/* Late Policy */}
          <div className="space-y-3">
            <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-2">
              <Clock size={12} className="text-red-400" /> มาสายสะสม (ครั้ง/เดือน)
            </label>
            <div className="bg-navy-950 p-4 rounded-2xl border border-border/50">
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="1" max="10" step="1"
                  value={policy.lateThreshold}
                  onChange={e => setPolicy(p => ({ ...p, lateThreshold: Number(e.target.value) }))}
                  className="flex-1 accent-red-500 h-1.5 bg-navy-800 rounded-full appearance-none cursor-pointer"
                />
                <span className="w-10 text-center text-lg font-bold text-foreground">{policy.lateThreshold}</span>
              </div>
              <p className="text-[10px] text-foreground-muted mt-2 italic">เกณฑ์ปัจจุบัน: เกิน {policy.lateThreshold} ครั้งจะถูกหักเงินเดือนอัตโนมัติ</p>
            </div>
          </div>

          {/* PIP Threshold */}
          <div className="space-y-3">
            <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-2">
              <TrendingDown size={12} className="text-red-400" /> Close Rate PIP Threshold (%)
            </label>
            <div className="bg-navy-950 p-4 rounded-2xl border border-border/50">
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="10" max="60" step="5"
                  value={policy.closeRatePipThreshold}
                  onChange={e => setPolicy(p => ({ ...p, closeRatePipThreshold: Number(e.target.value) }))}
                   className="flex-1 accent-red-500 h-1.5 bg-navy-800 rounded-full appearance-none cursor-pointer"
                />
                <span className="w-10 text-center text-lg font-bold text-foreground">{policy.closeRatePipThreshold}%</span>
              </div>
              <p className="text-[10px] text-foreground-muted mt-2 italic">หากอัตราปิดต่ำกว่า {policy.closeRatePipThreshold}% ติดต่อกัน 2 สัปดาห์ ระบบจะเปิดเคส PIP</p>
            </div>
          </div>

          {/* SLA Response */}
          <div className="space-y-3">
            <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold flex items-center gap-2">
              <BellRing size={12} className="text-red-400" /> Response SLA (นาที)
            </label>
            <div className="relative">
              <input 
                type="number"
                value={policy.responseTimeSla}
                onChange={e => setPolicy(p => ({ ...p, responseTimeSla: Number(e.target.value) }))}
                className="w-full bg-navy-950 border border-border rounded-xl px-4 py-3 text-foreground focus:border-red-500 outline-none text-sm font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-foreground-muted font-bold uppercase">MINS</span>
            </div>
          </div>

          <hr className="border-border/50" />

          <label className="flex items-center justify-between p-4 bg-navy-950 rounded-2xl border border-border/50 cursor-pointer group hover:border-red-500/30 transition-all">
            <div className="space-y-1">
              <span className="text-xs text-foreground font-bold group-hover:text-red-400 transition-colors">Auto-Escalate to CEO</span>
              <p className="text-[10px] text-foreground-muted">แจ้งเตือน CEO ทันทีผ่าน LINE เมื่อพนักงานติดสถานะ PIP</p>
            </div>
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                checked={policy.autoEscalateToCeo}
                onChange={e => setPolicy(p => ({ ...p, autoEscalateToCeo: e.target.checked }))}
                className="sr-only"
              />
              <div className={`block w-11 h-6 rounded-full transition-colors ${policy.autoEscalateToCeo ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-navy-800'}`} />
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${policy.autoEscalateToCeo ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
      </form>
    </SideDrawer>
  );
}
