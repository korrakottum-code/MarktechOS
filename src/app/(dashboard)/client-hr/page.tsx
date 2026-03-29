"use client";

import { useState } from "react";
import {
  mockClients,
  mockHRAlerts,
  mockPnL,
  getClientStatusColor,
  getClientStatusLabel,
  getAlertSeverityColor,
  getAlertTypeIcon,
} from "@/lib/mock-clients";
import { formatCurrency } from "@/lib/mock-data";
import {
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ClientHRPage() {
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const totalRevenue = mockPnL.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = mockPnL.reduce((s, p) => s + p.netProfit, 0);
  const criticalAlerts = mockHRAlerts.filter((a) => a.severity === "critical").length;
  const incompleteOnboarding = mockClients.filter((c) => !c.onboardingComplete).length;

  const statCards = [
    {
      label: "ลูกค้าทั้งหมด",
      value: mockClients.length.toString(),
      sub: `${mockClients.filter((c) => c.status === "active").length} active`,
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
      label: "HR Alert วิกฤต",
      value: criticalAlerts.toString(),
      sub: `จากทั้งหมด ${mockHRAlerts.length} เรื่อง`,
      icon: AlertTriangle,
      color: criticalAlerts > 0 ? "text-red-400" : "text-emerald-400",
      bg: criticalAlerts > 0 ? "from-red-500/20 to-red-500/5" : "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "Onboarding ไม่สมบูรณ์",
      value: incompleteOnboarding.toString(),
      sub: incompleteOnboarding > 0 ? "ต้องเก็บข้อมูลเพิ่ม" : "ครบถ้วน!",
      icon: FileText,
      color: incompleteOnboarding > 0 ? "text-amber-400" : "text-emerald-400",
      bg: incompleteOnboarding > 0 ? "from-amber-500/20 to-amber-500/5" : "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          📊 Client & HR Dashboard
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
            Module 3
          </span>
        </h1>
        <p className="text-foreground-muted mt-1">
          P&L รายคลินิก · Client Onboarding · HR Warning System
        </p>
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Profiles */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            🏥 ลูกค้าทั้งหมด — Client Requirement Hub
          </h2>
          {mockClients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const pnl = mockPnL.find((p) => p.clinic === client.name);

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
                      <div>
                        <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                          บริการที่ใช้
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {client.services.map((s) => (
                            <span key={s} className="text-[11px] px-2 py-1 rounded-lg bg-navy-700 text-foreground-muted">
                              {s}
                            </span>
                          ))}
                        </div>
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

                    {/* P&L */}
                    {pnl && (
                      <div>
                        <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                          💰 P&L เดือนนี้
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="bg-navy-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-foreground-muted">รายได้</p>
                            <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(pnl.revenue)}</p>
                          </div>
                          <div className="bg-navy-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-foreground-muted">ค่าแอด</p>
                            <p className="text-sm font-bold text-red-400 mt-1">-{formatCurrency(pnl.adSpend)}</p>
                          </div>
                          <div className="bg-navy-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-foreground-muted">ดำเนินการ</p>
                            <p className="text-sm font-bold text-red-400 mt-1">-{formatCurrency(pnl.operationCost)}</p>
                          </div>
                          <div className="bg-navy-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-foreground-muted">กำไรสุทธิ</p>
                            <p className={`text-sm font-bold mt-1 ${pnl.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatCurrency(pnl.netProfit)}
                            </p>
                          </div>
                          <div className="bg-navy-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-foreground-muted">Margin</p>
                            <p className={`text-sm font-bold mt-1 ${pnl.margin >= 20 ? "text-emerald-400" : pnl.margin >= 10 ? "text-amber-400" : "text-red-400"}`}>
                              {pnl.margin}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {client.requirements.length > 0 && (
                      <div>
                        <p className="text-xs text-foreground-muted mb-2 uppercase tracking-wider font-medium">
                          📋 Requirement ที่เก็บได้
                        </p>
                        <div className="space-y-2">
                          {client.requirements.map((req) => (
                            <div key={req.id} className="bg-navy-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-600 text-foreground-muted">
                                  {req.category}
                                </span>
                                <span className="text-xs text-foreground-muted">
                                  {req.question}
                                </span>
                              </div>
                              <p className={`text-sm ${req.answer ? "text-foreground" : "text-red-400 italic"}`}>
                                {req.answer || "⚠️ ยังไม่ได้เก็บข้อมูล"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* HR Alerts */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            ⚠️ HR Warning System
          </h2>
          <div className="space-y-3">
            {mockHRAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getAlertTypeIcon(alert.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {alert.employeeName}
                    </p>
                    <p className="text-xs text-foreground-muted mt-1">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-foreground-muted">
                        {new Date(alert.date).toLocaleDateString("th-TH")}
                      </span>
                      {alert.actionTaken ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          ✅ ดำเนินการแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          ❌ ยังไม่ดำเนินการ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
