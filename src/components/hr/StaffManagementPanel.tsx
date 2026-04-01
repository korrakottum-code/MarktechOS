"use client";

import { useState } from "react";
import { Users, AlertCircle, Briefcase, TrendingUp, Plus, Edit2, ShieldCheck, Settings } from "lucide-react";
import StaffFormModal from "./StaffFormModal";
import HRPolicyModal from "./HRPolicyModal";
import type { Admin, HRAlert, ClientProfile, HRPolicy } from "@/lib/app-data-types";
import { getAlertSeverityColor, getAlertTypeIcon, formatCurrency } from "@/lib/app-utils";

interface Props {
  admins: Admin[];
  hrAlerts: HRAlert[];
  onToggleAlert: (id: string) => void;
  clients: ClientProfile[];
  onSaveStaff: (admin: Admin) => void;
  onDeleteStaff: (id: string) => void;
  hrPolicy?: HRPolicy;
  onSavePolicy: (policy: HRPolicy) => void;
}

export default function StaffManagementPanel({ admins, hrAlerts, onToggleAlert, clients, onSaveStaff, onDeleteStaff, hrPolicy, onSavePolicy }: Props) {
  const [modal, setModal] = useState<{ open: boolean; admin?: Admin | null }>({ open: false });
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Staff Directory & Performance */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users size={20} className="text-gold-400" />
            รายชื่อพนักงานและผลงาน
          </h2>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-foreground-muted bg-navy-800 px-3 py-1.5 rounded-lg border border-border font-bold uppercase tracking-widest">
               TOTAL: {admins.length}
            </span>
            <button 
              onClick={() => setModal({ open: true })}
              className="flex items-center gap-2 px-4 py-1.5 bg-gold-500 text-navy-950 rounded-xl font-bold text-xs hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95"
            >
              <Plus size={14} /> เพิ่มพนักงาน
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((admin) => {
            const clientCount = clients.filter(c => (c.assignedAdminIds || []).includes(admin.id) || c.salesPersonId === admin.id || c.opLeadId === admin.id).length;

            return (
              <div key={admin.id} className="bg-navy-900 border border-border rounded-2xl p-5 hover:border-gold-500/30 transition-all group flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-xl shadow-inner border border-white/5">
                      {admin.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-gold-400 transition-colors">{admin.name}</h3>
                      <p className="text-[10px] text-foreground-muted uppercase tracking-widest">{admin.role}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${admin.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {admin.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-950/50 rounded-xl p-3 border border-border/30">
                    <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-medium">
                      {admin.role === 'admin' ? 'Revenue' : 
                       admin.role === 'sale' ? 'Pipeline' :
                       admin.role === 'ads opt' ? 'ROAS' : 'Tasks'}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {admin.role === 'admin' ? formatCurrency(admin.revenue) :
                       admin.role === 'sale' ? formatCurrency(admin.pipelineValue || 0) :
                       admin.role === 'ads opt' ? `${admin.roas || 0}x` : 
                       `${admin.completedTasks || 0} ชิ้น`}
                    </p>
                  </div>
                  <div className="bg-navy-950/50 rounded-xl p-3 border border-border/30 text-right">
                    <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-medium">Efficiency</p>
                    <p className={`text-sm font-bold ${admin.closeRate >= 40 ? 'text-green-400' : 'text-red-400'}`}>
                      {admin.closeRate}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                  <div>
                    <p className="text-[8px] text-foreground-muted uppercase tracking-widest">Base Salary</p>
                    <p className="text-xs font-medium text-foreground">{formatCurrency(admin.salary || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-foreground-muted uppercase tracking-widest">Clients</p>
                    <p className="text-xs font-medium text-foreground">{clientCount} ราย</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModal({ open: true, admin })}
                    className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-foreground text-xs font-bold transition-all border border-border/50 hover:border-gold-500/50 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={12} className="text-gold-400" /> จัดการโปรไฟล์
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-foreground-muted hover:text-foreground text-xs font-medium transition-all flex items-center justify-center gap-1.5">
                    <TrendingUp size={12} /> ดูผลงาน
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HR Warning System (Moved from M3) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            HR Warning System
          </h2>
          <button 
            onClick={() => setPolicyModalOpen(true)}
            className="p-2 text-foreground-muted hover:text-foreground hover:bg-navy-800 rounded-lg transition-colors border border-transparent hover:border-border/50"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border bg-navy-800/30">
              <p className="text-xs text-foreground-muted italic">
                รายการแจ้งเตือนพฤติกรรมและการทำงานของพนักงาน
              </p>
            </div>
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {hrAlerts.length > 0 ? (
                hrAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border ${getAlertSeverityColor(alert.severity)} bg-navy-950/30 transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg shrink-0">{getAlertTypeIcon(alert.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-foreground">
                            {alert.employeeName}
                          </p>
                          <span className="text-[10px] text-foreground-muted">
                            {new Date(alert.date).toLocaleDateString("th-TH")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          {alert.message}
                        </p>
                        <div className="mt-3 flex justify-end">
                          {alert.actionTaken ? (
                            <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20">
                              ✅ จัดการแล้ว
                            </span>
                          ) : (
                            <button 
                              onClick={() => onToggleAlert(alert.id)}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 active:scale-95"
                            >
                              รับทราบและจัดการ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center opacity-40">
                  <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-foreground-muted italic">ไม่มีการแจ้งเตือน HR ในขณะนี้ ทุกอย่างปกติดี!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-4">สรุปภาพรวมทีม</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground-muted">อัตราปิดการขายเฉลี่ย:</span>
                <span className="text-sm font-bold text-foreground">34.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground-muted">งานสะสมต่อคน:</span>
                <span className="text-sm font-bold text-foreground">4.2 แผนก/คน</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground-muted">HR Issues (Active):</span>
                <span className="text-sm font-bold text-red-400">{hrAlerts.filter(a => !a.actionTaken).length} รายการ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StaffFormModal 
        open={modal.open}
        admin={modal.admin}
        onClose={() => setModal({ open: false })}
        onSave={(data) => {
          onSaveStaff(data);
          setModal({ open: false });
        }}
        onDelete={(id) => {
          onDeleteStaff(id);
          setModal({ open: false });
        }}
      />
      <HRPolicyModal 
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        initialPolicy={hrPolicy}
        onSave={(data) => {
          onSavePolicy(data);
          setPolicyModalOpen(false);
        }}
      />
    </div>
  );
}
