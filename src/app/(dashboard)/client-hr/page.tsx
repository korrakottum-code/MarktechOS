"use client";

import { useState } from "react";
import {
  getClientStatusColor,
  getClientStatusLabel,
  getAlertSeverityColor,
  getAlertTypeIcon,
  getNpsColor,
  getNpsLabel,
  getRetentionPlanLabel,
  getRetentionPlanColor,
} from "@/lib/app-utils";
import { formatCurrency } from "@/lib/app-utils";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import ClientFormModal from "@/components/crm/ClientFormModal";
import {
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Plus,
  Edit2,
} from "lucide-react";

export default function ClientHRPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const clients = payload?.data.clients ?? [];
  const hrAlerts = payload?.data.hrAlerts ?? [];
  const pnlRows = payload?.data.pnlRows ?? [];
  const admins = payload?.data.admins ?? [];
  const invoices = payload?.data.invoices ?? [];
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientModal, setClientModal] = useState<{ open: boolean; client?: any }>({ open: false });

  if (loading) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  function handleToggleChecklist(clientId: string, listType: "onboardingChecklists" | "offboardingChecklists", itemId: string, completed: boolean) {
    const updatedClients = clients.map(c => {
      if (c.id !== clientId) return c;
      const newList = c[listType].map((item: any) => 
        item.id === itemId ? { ...item, completed } : item
      );
      return { ...c, [listType]: newList };
    });
    patchSection("clients", updatedClients);
  }

  function handleSaveClient(client: any) {
    const existing = clients.find((c: any) => c.id === client.id);
    const updated = existing
      ? clients.map((c: any) => (c.id === client.id ? client : c))
      : [...clients, client];
    patchSection("clients", updated);
    setClientModal({ open: false });
  }

  function handleDeleteClient(id: string) {
    const updated = clients.filter((c: any) => c.id !== id);
    patchSection("clients", updated);
    setClientModal({ open: false });
  }

  const totalRevenue = pnlRows.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = pnlRows.reduce((s, p) => s + p.netProfit, 0);
  const criticalAlerts = hrAlerts.filter((a) => a.severity === "critical").length;
  const incompleteOnboarding = clients.filter((c) => !c.onboardingComplete).length;
  const pendingAdminAssignment = clients.filter(
    (c) => c.services?.includes("Admin ตอบแชท") && (!c.assignedAdminIds || c.assignedAdminIds.length === 0)
  ).length;
  const overdueInvoices = invoices.filter((i: any) => i.status === "overdue").length;

  const statCards = [
    {
      label: "ลูกค้าทั้งหมด",
      value: clients.length.toString(),
      sub: `${clients.filter((c) => c.status === "active").length} active`,
      icon: Users,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "รายได้รวม/เดือน",
      value: formatCurrency(totalRevenue),
      sub: `กำไรสุทธิ ${formatCurrency(totalProfit)}`,
      icon: DollarSign,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "Onboarding ไม่ครบ",
      value: incompleteOnboarding.toString(),
      sub: `รอจัดการ ${incompleteOnboarding} ราย`,
      icon: AlertTriangle,
      color: incompleteOnboarding > 0 ? "text-amber-400" : "text-emerald-400",
      bg: incompleteOnboarding > 0 ? "from-amber-500/20 to-amber-500/5" : "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "รอระบุแอดมิน",
      value: pendingAdminAssignment.toString(),
      sub: `ต้องการแอดมินตอบแชท`,
      icon: FileText,
      color: pendingAdminAssignment > 0 ? "text-red-400" : "text-emerald-400",
      bg: pendingAdminAssignment > 0 ? "from-red-500/20 to-red-500/5" : "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  function handleToggleAlert(alertId: string) {
    const updated = hrAlerts.map(a => a.id === alertId ? { ...a, actionTaken: true } : a);
    patchSection("hrAlerts", updated);
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      {clientModal.open && (
        <ClientFormModal
          client={clientModal.client}
          admins={admins}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onClose={() => setClientModal({ open: false })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
              Module 3
            </span>
            <span className="text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
              Phase 2: Client Onboarding & Phase 5: P&L
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Client Hub & Onboarding
          </h1>
          <p className="text-foreground-muted mt-1">
            Requirement Hub · Client Checklists · P&L รายคลินิก
          </p>
        </div>
        <button
          onClick={() => setClientModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-navy-950 rounded-xl font-medium text-sm hover:bg-gold-400 transition-colors"
        >
          <Plus size={18} />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
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

      {/* Main Layout Adjustments */}
      <div className="flex flex-col gap-6">
        {/* Client Profiles — Full Width since HR is decoupled */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-6 bg-gold-500 rounded-full" />
              🏥 ลูกค้าทั้งหมด — Client Requirement Hub
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-foreground-muted px-3 py-1.5 bg-navy-900 border border-border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Active: {clients.filter(c => c.status === 'active').length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-muted px-3 py-1.5 bg-navy-900 border border-border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>New Onboarding: {clients.filter(c => !c.onboardingComplete).length}</span>
              </div>
            </div>
          </div>
          {clients.length > 0 ? clients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const pnl = pnlRows.find((p) => p.clinic === client.name);
            const needsAdmin = (client.services || []).includes("svc-3"); // Page Admin ID
            const hasAdmin = client.assignedAdminIds && client.assignedAdminIds.length > 0;
            const isPendingAdmin = needsAdmin && !hasAdmin;
            
            const salesPerson = admins.find(a => a.id === client.salesPersonId);
            const opLead = admins.find(a => a.id === client.opLeadId);
            
            const assignedAdminNames = (client.assignedAdminIds || []).map(
              (id: string) => admins.find((a: any) => a.id === id)?.name || id
            );
            const clientInvoices = invoices.filter((i: any) => i.clientId === client.id);
            const clientOverdue = clientInvoices.filter((i: any) => i.status === "overdue");

            return (
              <div
                key={client.id}
                className="bg-navy-900 border border-border rounded-2xl overflow-hidden"
              >
                {/* Card Header */}
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-navy-800/50 transition-colors"
                  onClick={() =>
                    setExpandedClient(isExpanded ? null : client.id)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-500/5 flex items-center justify-center text-lg">
                      🏥
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {client.name}
                      </h3>
                      <p className="text-xs text-foreground-muted">
                        {client.contactPerson} · {client.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-lg ${getClientStatusColor(client.status)}`}>
                      {getClientStatusLabel(client.status)}
                    </span>
                    {!client.onboardingComplete && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400">
                        📝 Onboarding ไม่ครบ
                      </span>
                    )}
                    {isPendingAdmin && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 animate-pulse">
                        ⚠️ รอระบุแอดมิน
                      </span>
                    )}
                    {clientOverdue.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400">
                        🚨 ค้างชำระ
                      </span>
                    )}
                    {client.retentionPlan && client.retentionPlan !== "none" && (
                      <span className={`text-xs px-2 py-1 rounded-lg ${getRetentionPlanColor(client.retentionPlan)}`}>
                        {getRetentionPlanLabel(client.retentionPlan)}
                      </span>
                    )}
                    {client.npsScore !== undefined && (
                      <span className={`text-xs font-mono font-bold ${getNpsColor(client.npsScore)}`}>
                        NPS {getNpsLabel(client.npsScore)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientModal({ open: true, client });
                      }}
                      className="p-1.5 rounded-lg hover:bg-navy-700 text-foreground-muted hover:text-gold-400 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-foreground-muted" />
                    ) : (
                      <ChevronDown size={18} className="text-foreground-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border pt-4 space-y-4 animate-fade-in">
                    {/* Services & Contract */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                            บริการที่ใช้ (Service Catalog)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(client.services || []).map((s: string) => {
                              const svc = payload?.data.serviceProducts.find(p => p.id === s);
                              return (
                                <span key={s} className="text-[11px] px-2 py-1 rounded-lg bg-navy-700 text-foreground-muted border border-border/30">
                                  {svc ? `${svc.icon} ${svc.shortName}` : s}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Team Section */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-blue-400 mb-1.5 uppercase tracking-widest font-bold">
                              🤝 ขายโดย (Sales)
                            </p>
                            {salesPerson ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center text-xs">
                                  {salesPerson.avatar}
                                </div>
                                <span className="text-xs text-foreground font-medium">{salesPerson.name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-foreground-muted italic">รอระบุ...</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-purple-400 mb-1.5 uppercase tracking-widest font-bold">
                              ⚡ คุมงานโดย (Ops Lead)
                            </p>
                            {opLead ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center text-xs">
                                  {opLead.avatar}
                                </div>
                                <span className="text-xs text-foreground font-medium">{opLead.name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-foreground-muted italic">รอระบุ...</span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Admins */}
                        {needsAdmin && (
                          <div className="pt-1">
                            <p className="text-[10px] text-emerald-400 mb-1.5 uppercase tracking-widest font-bold">
                              💬 ทีมแอดมินตอบแชท
                            </p>
                            {hasAdmin ? (
                              <div className="flex flex-wrap gap-1.5">
                                {assignedAdminNames.map((name: string) => (
                                  <span key={name} className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20">
                                ⚠️ ยังไม่ได้ระบุแอดมิน
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                          สัญญา
                        </p>
                        <p className="text-sm text-foreground">
                          {new Date(client.contractStart).toLocaleDateString("th-TH")} — {new Date(client.contractEnd).toLocaleDateString("th-TH")}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">
                          ค่าบริการ {formatCurrency(client.monthlyFee)}/เดือน · งบแอด {formatCurrency(client.adBudget)}/เดือน
                        </p>
                      </div>
                    </div>

                    {/* NPS & Retention */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                          📊 NPS / Satisfaction
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${getNpsColor(client.npsScore)}`}>
                            {client.npsScore !== undefined ? `${client.npsScore}/10` : "—"}
                          </span>
                          {client.npsScore !== undefined && (
                            <span className="text-xs text-foreground-muted">
                              {client.npsScore >= 8 ? "พอใจมาก → ต่อสัญญา" : client.npsScore >= 5 ? "ปานกลาง → ต้อง Monitor" : "ไม่พอใจ → Critical"}
                            </span>
                          )}
                        </div>
                      </div>
                      {client.status === "offboarding" && (
                        <div>
                          <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                            ⏹️ เหตุผล Offboarding
                          </p>
                          <p className="text-sm text-red-400">
                            {client.offboardingReason || "ไม่ระบุเหตุผล"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interactive Checklist Section */}
                    {((client.status === "offboarding" ? client.offboardingChecklists : client.onboardingChecklists) || []).length > 0 && (
                      <div className="bg-navy-900 border border-border rounded-xl p-4 mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-xs text-foreground-muted uppercase tracking-wider font-medium">
                            📋 {client.status === "offboarding" ? "Offboarding Checklist" : "Onboarding Checklist"}
                          </p>
                          <span className="text-xs font-mono bg-navy-800 text-gold-400 px-2 py-0.5 rounded-full">
                            {(() => {
                              const list = client.status === "offboarding" ? client.offboardingChecklists : client.onboardingChecklists;
                              const completed = list.filter((l: any) => l.completed).length;
                              return `${completed} / ${list.length}`;
                            })()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(client.status === "offboarding" ? client.offboardingChecklists : client.onboardingChecklists).map((item: any) => (
                            <label
                              key={item.id}
                              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                item.completed ? "hover:bg-emerald-500/5 text-foreground-muted line-through" : "hover:bg-navy-800 text-foreground"
                              }`}
                            >
                              <div className="pt-0.5" onClick={() => handleToggleChecklist(client.id, client.status === "offboarding" ? "offboardingChecklists" : "onboardingChecklists", item.id, !item.completed)}>
                                {item.completed ? (
                                  <CheckSquare size={16} className="text-emerald-400" />
                                ) : (
                                  <Square size={16} className="text-foreground-muted" />
                                )}
                              </div>
                              <span className="text-sm select-none flex-1" onClick={() => handleToggleChecklist(client.id, client.status === "offboarding" ? "offboardingChecklists" : "onboardingChecklists", item.id, !item.completed)}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* P&L */}
                    {pnl && (
                      <div className="animate-fade-in animation-delay-300">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-foreground-muted uppercase tracking-wider font-medium">
                            💰 P&L เดือนนี้
                          </p>
                          {pnl.adBillingType === "direct" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ลูกค้าจ่ายค่าแอดตรง
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="bg-navy-800 rounded-xl p-3 text-center border border-border/50 shadow-inner">
                            <p className="text-[10px] text-gold-400 uppercase tracking-tight font-bold">Service Revenue</p>
                            <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(pnl.revenue)}</p>
                          </div>
                          
                          <div className="bg-navy-800 rounded-xl p-3 text-center border border-border/50">
                            <p className="text-[10px] text-foreground-muted uppercase tracking-tight">ค่าแอด (Ads)</p>
                            <p className={`text-sm font-bold mt-1 ${pnl.adBillingType === "agency" ? "text-red-400" : "text-foreground-muted"}`}>
                              {pnl.adBillingType === "agency" ? "-" : ""}{formatCurrency(pnl.adSpend)}
                            </p>
                          </div>

                          <div className="group relative bg-navy-800 rounded-xl p-3 text-center border border-border/50 hover:border-gold-500/30 transition-colors cursor-help">
                            <p className="text-[10px] text-foreground-muted uppercase tracking-tight">ดำเนินการ</p>
                            <p className="text-sm font-bold text-red-400 mt-1">
                              -{formatCurrency(
                                (Number(pnl.adminCost) || 0) + 
                                (Number(pnl.productionCost) || 0) + 
                                (Number(pnl.adsOptSharedCost) || 0) + 
                                (Number(pnl.commission) || 0) + 
                                (Number(pnl.otherDirectCosts) || 0)
                              )}
                            </p>
                            {/* Breakdown Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-navy-950 border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-left">
                              <p className="text-[10px] font-bold text-gold-400 mb-2 border-b border-border/50 pb-1">รายละเอียดต้นทุน</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-foreground-muted">ทีมแอดมิน:</span>
                                  <span className="text-foreground font-mono">{formatCurrency(pnl.adminCost)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-foreground-muted">ทีมผลิต (Share):</span>
                                  <span className="text-foreground font-mono">{formatCurrency(pnl.productionCost)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-foreground-muted">ทีม Ads Opt (Share):</span>
                                  <span className="text-foreground font-mono">{formatCurrency(pnl.adsOptSharedCost)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-foreground-muted">ค่าคอมมิชชั่น:</span>
                                  <span className="text-foreground font-mono">{formatCurrency(pnl.commission)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-navy-800 rounded-xl p-3 text-center border border-border/50 shadow-inner">
                            <p className="text-[10px] text-foreground-muted uppercase tracking-tight">กำไรสุทธิ</p>
                            <p className={`text-sm font-bold mt-1 ${pnl.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatCurrency(pnl.netProfit)}
                            </p>
                          </div>
                          
                          <div className="bg-navy-800 rounded-xl p-3 text-center border border-border/50">
                            <p className="text-[10px] text-foreground-muted uppercase tracking-tight">Margin</p>
                            <p className={`text-sm font-bold mt-1 ${pnl.margin >= 20 ? "text-emerald-400" : pnl.margin >= 10 ? "text-amber-400" : "text-red-400"}`}>
                              {pnl.margin}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requirement Hub */}
                    <div>
                      <p className="text-xs text-foreground-muted mb-3 uppercase tracking-wider font-medium flex items-center gap-2">
                        📋 Requirement Hub
                      </p>
                      
                      {/* Standard Requirements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="bg-navy-800/50 rounded-xl p-3 border border-border/30">
                          <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1 font-bold">Target Group</p>
                          <p className="text-sm text-foreground">{client.standardRequirements.targetGroup || "—"}</p>
                        </div>
                        <div className="bg-navy-800/50 rounded-xl p-3 border border-border/30">
                          <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1 font-bold">KPI Goal</p>
                          <p className="text-sm text-foreground">{client.standardRequirements.kpiGoal || "—"}</p>
                        </div>
                        <div className="bg-navy-800/50 rounded-xl p-3 border border-border/30">
                          <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1 font-bold">Brand Tone</p>
                          <p className="text-sm text-foreground">{client.standardRequirements.brandTone || "—"}</p>
                        </div>
                        <div className="bg-navy-800/50 rounded-xl p-3 border border-border/30">
                          <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1 font-bold">Main Procedure</p>
                          <p className="text-sm text-foreground">{client.standardRequirements.mainProcedure || "—"}</p>
                        </div>
                      </div>

                      {/* Custom Add-ons */}
                      {(client.customRequirements || []).length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <p className="text-[11px] text-foreground-muted mb-2 italic">Additional Requirements:</p>
                          {client.customRequirements.map((req: any) => (
                            <div key={req.id} className="bg-navy-850 rounded-xl p-3 border border-border/30">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-foreground-muted border border-border/50 font-medium">
                                  {req.category}
                                </span>
                                <span className="text-xs text-foreground-muted font-medium">
                                  {req.question}
                                </span>
                              </div>
                              <p className={`text-sm ${req.answer ? "text-foreground" : "text-red-400/70 italic"}`}>
                                {req.answer || "ยังไม่ได้ระบุรายละเอียด"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-12 bg-navy-900 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
              <p className="text-foreground-muted">ยังไม่มีข้อมูลลูกค้าในระบบ</p>
              <button
                onClick={() => setClientModal({ open: true })}
                className="mt-4 text-xs px-4 py-2 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-lg hover:bg-gold-500/20 transition-colors"
              >
                เพิ่มลูกค้าใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
