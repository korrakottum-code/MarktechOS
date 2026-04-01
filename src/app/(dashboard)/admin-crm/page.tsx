"use client";

import { useState } from "react";
import type { SalesDeal, OperationTask, Admin, Lead } from "@/lib/app-data-types";
import { 
  serviceProducts, 
  getDealStageLabel, 
  getDealStageColor,
  formatCurrency 
} from "@/lib/app-utils";
// Duplicate imports removed, Admin, Lead, formatCurrency already handled above
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import LeadFormModal from "@/components/crm/LeadFormModal";
import {
  Package,
  TrendingUp,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { createOnboardingTasks, createClientFromDeal } from "@/lib/integration-utils";
// Duplicate import removed, OperationTask already imported above
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";
import MarkTechDatePicker from "@/components/ui/DatePicker";
import { Filter, Calendar } from "lucide-react";

export default function AdminCrmPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const [activeTab, setActiveTab] = useState<"overview" | "admin">("overview");
  const [filterRange, setFilterRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });
  const [leadModal, setLeadModal] = useState<{ open: boolean; lead?: Lead }>({ open: false });

  const admins = payload?.data.admins ?? [];
  const leads = payload?.data.leads ?? [];
  const deals = (payload?.data.salesDeals ?? []) as SalesDeal[];
  const operationTasks = (payload?.data.operationTasks ?? []) as OperationTask[];
  const dashboardStats = payload?.stats.dashboard;
  const salesStats = payload?.stats.sales;

  if (loading || !dashboardStats || !salesStats) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  function handleSaveLead(lead: Lead) {
    const existing = leads.find((l) => l.id === lead.id);
    const updated = existing
      ? leads.map((l) => (l.id === lead.id ? lead : l))
      : [...leads, lead];
    patchSection("leads", updated);
    setLeadModal({ open: false });
  }

  function handleDeleteLead(id: string) {
    const updated = leads.filter((l) => l.id !== id);
    patchSection("leads", updated);
    setLeadModal({ open: false });
  }

  return (
    <div className="space-y-6">
      {leadModal.open && (
        <LeadFormModal
          lead={leadModal.lead}
          admins={admins}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
          onClose={() => setLeadModal({ open: false })}
        />
      )}
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
            Module 5
          </span>
          <span className="text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
            Phase 4: Chat Admin & Execution
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Admin CRM (Chat Execution)
        </h1>
        <p className="text-foreground-muted mt-1">
          มอนิเตอร์ประสิทธิภาพการตอบแชท · จัดการคิว Lead ของคนไข้รายวัน
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-navy-900 border border-border rounded-xl p-1 w-fit">
        {[
          { key: "overview" as const, label: "💡 Overview", desc: "ภาพรวมแอดมิน" },
          { key: "admin" as const, label: "💬 Admin Performance", desc: "ประสิทธิภาพ" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === tab.key
                ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                : "text-foreground-muted hover:text-foreground hover:bg-navy-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global Filter Bar */}
      <div className="bg-navy-900/50 border border-border/50 rounded-3xl p-4 flex flex-wrap items-center gap-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gold-400" />
          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Performance Filters:</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-muted uppercase">Analysis Period:</span>
            <MarkTechDatePicker 
              mode="range" 
              value={filterRange} 
              onChange={setFilterRange} 
              placeholder="Select Date Range"
              className="w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-navy-950/50 px-4 py-2.5 rounded-xl border border-border/50">
           <Calendar size={14} className="text-gold-400" />
           <span className="text-xs text-foreground font-medium">Viewing Range: <span className="text-gold-400 font-bold">{filterRange.start ? filterRange.start.toLocaleDateString('th-TH') : "Today"} - {filterRange.end ? filterRange.end.toLocaleDateString('th-TH') : "Now"}</span></span>
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <ExecutiveDashboard 
          leads={leads}
          deals={deals}
          tasks={operationTasks}
          stats={{ crm: dashboardStats, sales: salesStats }}
        />
      )}
      {activeTab === "admin" && (
        <AdminCRMContent
          admins={admins}
          leads={leads}
          stats={dashboardStats}
          onCreateLead={() => setLeadModal({ open: true })}
          onEditLead={(lead) => setLeadModal({ open: true, lead })}
        />
      )}
    </div>
  );
}

// ==============================
// Tab 1: Admin CRM (เดิม)
// ==============================

import AdminPerformanceBoard from "@/components/crm/AdminPerformanceBoard";
import LeadQueue from "@/components/crm/LeadQueue";
import GamificationBar from "@/components/crm/GamificationBar";
import { Clock } from "lucide-react";

function AdminCRMContent({
  admins,
  leads,
  stats,
  onCreateLead,
  onEditLead,
}: {
  admins: Admin[];
  leads: Lead[];
  stats: {
    totalLeads: number;
    closedLeads: number;
    newLeads: number;
    avgCloseRate: number;
  };
  onCreateLead: () => void;
  onEditLead: (lead: Lead) => void;
}) {
  const avgResponseTime =
    admins.reduce((sum, a) => sum + a.avgResponseTime, 0) /
    (admins.length || 1);

  const crmCards = [
    {
      label: "Lead ทั้งหมด",
      value: stats.totalLeads.toString(),
      sub: `${stats.newLeads} ใหม่ รอรับ`,
      icon: Users,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "ปิดการขายแล้ว",
      value: stats.closedLeads.toString(),
      sub: `จาก ${stats.totalLeads} Lead`,
      icon: Target,
      color: "text-emerald-400",
      bg: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "Close Rate เฉลี่ย",
      value: `${stats.avgCloseRate}%`,
      sub: "เกณฑ์ขั้นต่ำ 30%",
      icon: TrendingUp,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "เวลาตอบเฉลี่ย",
      value: `${Math.round(avgResponseTime)} นาที`,
      sub: "ยิ่งเร็วยิ่งดี",
      icon: Clock,
      color: "text-purple-400",
      bg: "from-purple-500/20 to-purple-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            💬 Admin CRM — ทีมแอดมิน
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            มอนิเตอร์ประสิทธิภาพการตอบแชทและจัดการ Lead ของแอดมิน
          </p>
        </div>
        <button
          onClick={onCreateLead}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20"
        >
          <Plus size={18} />
          สร้าง Lead ใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {crmCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center`}
                >
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-foreground-muted">{card.label}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
            </div>
          );
        })}
      </div>
      <GamificationBar admins={admins} />
      <AdminPerformanceBoard admins={admins} />
      <LeadQueue leads={leads} admins={admins} onCreateLead={onCreateLead} onEditLead={onEditLead} />
    </div>
  );
}

// ==============================
// Tab 2: Sales Pipeline
// ==============================
import { Plus } from "lucide-react";
import DealFormModal from "@/components/crm/DealFormModal";

function SalesPipelineContent({
  deals,
  salesStats,
  services,
  onCreateDeal,
  onEditDeal,
}: {
  deals: SalesDeal[];
  salesStats: {
    totalDeals: number;
    wonDeals: number;
    pipelineValue: number;
    weightedPipeline: number;
    wonValue: number;
  };
  services: typeof serviceProducts;
  onCreateDeal: () => void;
  onEditDeal: (deal: SalesDeal) => void;
}) {
  const stats = salesStats;

  const salesCards = [
    {
      label: "Deal ทั้งหมด",
      value: stats.totalDeals.toString(),
      sub: `${stats.wonDeals} ปิดสำเร็จ`,
      icon: Target,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(stats.pipelineValue),
      sub: "มูลค่ารวมใน Pipeline",
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "Weighted Pipeline",
      value: formatCurrency(stats.weightedPipeline),
      sub: "ถ่วงน้ำหนักตามโอกาสปิด",
      icon: DollarSign,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "Won Revenue",
      value: formatCurrency(stats.wonValue),
      sub: "รายได้ที่ปิดแล้ว",
      icon: Package,
      color: "text-emerald-400",
      bg: "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center`}
                >
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-foreground-muted">{card.label}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Deals Table */}
      <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              🤝 Sales Pipeline — Deals ทั้งหมด
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              ติดตามทุก Deal ตั้งแต่ Prospect จนถึง Won
            </p>
          </div>
          <button
            onClick={onCreateDeal}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20"
          >
            <Plus size={18} />
            สร้าง Deal ใหม่
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-muted border-b border-border">
                <th className="px-6 py-3 font-medium">ธุรกิจ</th>
                <th className="px-6 py-3 font-medium">ผู้ติดต่อ</th>
                <th className="px-6 py-3 font-medium">บริการ</th>
                <th className="px-6 py-3 font-medium text-center">Stage</th>
                <th className="px-6 py-3 font-medium text-center">โอกาสปิด</th>
                <th className="px-6 py-3 font-medium text-right">มูลค่า</th>
                <th className="px-6 py-3 font-medium">Sale</th>
                <th className="px-6 py-3 font-medium text-right">คาดว่าจะปิด</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => {
                const dealServices = deal.services.map(
                  (sid) =>
                    services.find((s) => s.id === sid)?.shortName || sid
                );
                return (
                  <tr
                    key={deal.id}
                    onClick={() => onEditDeal(deal)}
                    className={`border-b border-border/30 hover:bg-navy-800/50 transition-colors cursor-pointer ${
                      deal.stage === "won" ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground">
                        {deal.businessName}
                      </p>
                      <p className="text-[11px] text-foreground-muted">
                        {deal.businessType}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-foreground">{deal.contactPerson}</p>
                      <p className="text-[11px] text-foreground-muted">
                        {deal.phone}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {dealServices.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-foreground-muted"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-lg ${getDealStageColor(
                          deal.stage
                        )}`}
                      >
                        {getDealStageLabel(deal.stage)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              deal.probability >= 70
                                ? "bg-emerald-400"
                                : deal.probability >= 40
                                ? "bg-amber-400"
                                : "bg-gray-400"
                            }`}
                            style={{
                              width: `${deal.probability}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-foreground-muted">
                          {deal.probability}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {formatCurrency(deal.dealValue)}
                    </td>
                    <td className="px-6 py-3 text-foreground">
                      {deal.salesperson}
                    </td>
                    <td className="px-6 py-3 text-right text-foreground-muted text-xs">
                      {new Date(deal.expectedClose).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==============================
// Tab 3: Service Catalog
// ==============================

function ServiceCatalogContent({ services }: { services: typeof serviceProducts }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "marketing":
        return "from-blue-500/20 to-blue-500/5 border-blue-500/20";
      case "content":
        return "from-purple-500/20 to-purple-500/5 border-purple-500/20";
      case "admin":
        return "from-gold-500/20 to-gold-500/5 border-gold-500/20";
      default:
        return "from-gray-500/20 to-gray-500/5 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-navy-900 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          📦 Service Catalog — บริการของ Marktech Media
        </h2>
        <p className="text-sm text-foreground-muted mb-6">
          บริการทั้ง 3 ประเภท ที่ทีม Sale นำไปเสนอลูกค้า
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className={`bg-gradient-to-br ${getCategoryColor(
                svc.category
              )} border rounded-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className="p-5">
                <div className="text-3xl mb-3">{svc.icon}</div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {svc.name}
                </h3>
                <p className="text-sm text-foreground-muted mb-3">
                  {svc.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-lg bg-navy-800 text-foreground-muted">
                    {svc.activeClients} ลูกค้า Active
                  </span>
                </div>
              </div>

              {/* Features Toggle */}
              <div className="border-t border-border/30">
                <button
                  onClick={() =>
                    setExpanded(expanded === svc.id ? null : svc.id)
                  }
                  className="w-full px-5 py-3 flex items-center justify-between text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <span>ดูรายละเอียดบริการ ({svc.features.length} หัวข้อ)</span>
                  {expanded === svc.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {expanded === svc.id && (
                  <div className="px-5 pb-5 space-y-2 animate-fade-in">
                    {svc.features.map((feat, j) => (
                      <div key={j} className="bg-navy-800/80 rounded-xl p-3">
                        <p className="text-sm font-medium text-foreground">
                          {j + 1}. {feat.title}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">
                          {feat.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
