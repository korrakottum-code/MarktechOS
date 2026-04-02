"use client";

import { useState } from "react";
import type { SalesDeal, OperationTask } from "@/lib/app-data-types";
import { 
  serviceProducts, 
  getDealStageLabel, 
  getDealStageColor,
  formatCurrency 
} from "@/lib/app-utils";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import DealFormModal from "@/components/crm/DealFormModal";
import {
  Package,
  TrendingUp,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { createOnboardingTasks, createClientFromDeal } from "@/lib/integration-utils";
// Duplicate import removed, OperationTask already imported above
import MarkTechDatePicker from "@/components/ui/DatePicker";
import { Filter, Calendar } from "lucide-react";
import { DashboardLoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function SalesPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection, multiPatch } = useAppDataMutation(setPayload);
  const [activeTab, setActiveTab] = useState<"pipeline" | "services">("pipeline");
  const [filterMonth, setFilterMonth] = useState(new Date());
  const [dealModal, setDealModal] = useState<{ open: boolean; deal?: SalesDeal }>({ open: false });

  const deals = (payload?.data.salesDeals ?? []) as SalesDeal[];
  const operationTasks = (payload?.data.operationTasks ?? []) as OperationTask[];
  const clients = payload?.data.clients ?? [];
  const services = payload?.data.serviceProducts ?? serviceProducts;
  const salesStats = payload?.stats.sales;

  if (loading || !salesStats) {
    return <DashboardLoadingSkeleton />;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  function handleSaveDeal(deal: SalesDeal) {
    const existing = deals.find((d) => d.id === deal.id);
    
    if (deal.stage === "won" && (!existing || existing.stage !== "won")) {
      const patches: any = {};
      const newTasksRaw = createOnboardingTasks(deal);
      const newTasks = newTasksRaw.map((t, idx) => ({
        ...t,
        id: `task-auto-${Date.now()}-${idx}`,
      })) as OperationTask[];
      patches.operationTasks = [...operationTasks, ...newTasks];

      const newClientRaw = createClientFromDeal(deal);
      const newClient = {
        ...newClientRaw,
        id: `client-won-${Date.now()}`,
      };
      patches.clients = [...clients, newClient];
      
      multiPatch(patches);
    }

    const updated = existing
      ? deals.map((d) => (d.id === deal.id ? deal : d))
      : [...deals, deal];
    patchSection("salesDeals", updated);
    setDealModal({ open: false });
  }

  function handleDeleteDeal(id: string) {
    const updated = deals.filter((d) => d.id !== id);
    patchSection("salesDeals", updated);
    setDealModal({ open: false });
  }

  const setDealModalState = (state: { open: boolean; deal?: SalesDeal }) => setDealModal(state);

  return (
    <div className="space-y-6">
      {dealModal.open && (
        <DealFormModal
          deal={dealModal.deal}
          onSave={handleSaveDeal}
          onDelete={handleDeleteDeal}
          onClose={() => setDealModal({ open: false })}
        />
      )}
      
      {/* Global Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
              Module 1
            </span>
            <span className="text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
              Phase 1: Sales & Client Acquisition
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Sales & Deal Pipeline
          </h1>
        </div>

        {/* Tab Switcher Moved into Header Area */}
        <div className="flex items-center gap-1 bg-navy-900 border border-border rounded-xl p-1 w-fit shadow-inner">
          {[
            { key: "pipeline" as const, label: "🤝 Pipeline", desc: "ติดตามดีล" },
            { key: "services" as const, label: "📦 Catalog", desc: "รายการบริการ" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-gold-500 text-navy-950 shadow-lg shadow-gold-500/20"
                  : "text-foreground-muted hover:text-foreground hover:bg-navy-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-navy-900/50 border border-border/50 rounded-3xl p-4 flex flex-wrap items-center gap-6 shadow-xl backdrop-blur-md relative z-50 isolate">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gold-400" />
          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Pipeline Filters:</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-muted uppercase">Showing Deals for:</span>
            <MarkTechDatePicker 
              mode="month" 
              value={filterMonth} 
              onChange={setFilterMonth} 
              className="w-48 relative z-[100]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-navy-950/50 px-4 py-2.5 rounded-xl border border-border/50">
           <Calendar size={14} className="text-gold-400" />
           <span className="text-xs text-foreground font-medium">Pipeline Focus: <span className="text-gold-400 font-bold">{filterMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></span>
        </div>
      </div>

      {activeTab === "pipeline" && (
        <SalesPipelineContent 
          deals={deals} 
          salesStats={salesStats} 
          services={services} 
          onCreateDeal={() => setDealModal({ open: true })}
          onEditDeal={(deal) => setDealModal({ open: true, deal })}
        />
      )}
      {activeTab === "services" && <ServiceCatalogContent services={services} />}
    </div>
  );
}

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
