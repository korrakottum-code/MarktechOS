"use client";

import { useState } from "react";
import {
  serviceProducts,
  mockDeals,
  getSalesPipelineStats,
  getDealStageLabel,
  getDealStageColor,
} from "@/lib/mock-services";
import { formatCurrency } from "@/lib/mock-data";
import {
  Package,
  TrendingUp,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";

export default function AdminCrmPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "sales" | "services">(
    "admin"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          📊 Admin CRM & Sales Pipeline
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
            Module 1
          </span>
        </h1>
        <p className="text-foreground-muted mt-1">
          จัดการทีมแอดมิน · Sales Pipeline · Service Catalog
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-navy-900 border border-border rounded-xl p-1 w-fit">
        {[
          { key: "admin" as const, label: "💬 Admin CRM", desc: "ทีมตอบแชท" },
          { key: "sales" as const, label: "🤝 Sales Pipeline", desc: "ทีมขาย" },
          { key: "services" as const, label: "📦 Service Catalog", desc: "บริการ" },
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

      {/* Content */}
      {activeTab === "admin" && <AdminCRMContent />}
      {activeTab === "sales" && <SalesPipelineContent />}
      {activeTab === "services" && <ServiceCatalogContent />}
    </div>
  );
}

// ==============================
// Tab 1: Admin CRM (เดิม)
// ==============================

import {
  mockAdmins,
  mockLeads,
  getDashboardStats,
} from "@/lib/mock-data";
import AdminPerformanceBoard from "@/components/crm/AdminPerformanceBoard";
import LeadQueue from "@/components/crm/LeadQueue";
import GamificationBar from "@/components/crm/GamificationBar";
import { Clock } from "lucide-react";

function AdminCRMContent() {
  const stats = getDashboardStats();
  const avgResponseTime =
    mockAdmins.reduce((sum, a) => sum + a.avgResponseTime, 0) /
    mockAdmins.length;

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
      <GamificationBar admins={mockAdmins} />
      <AdminPerformanceBoard admins={mockAdmins} />
      <LeadQueue leads={mockLeads} admins={mockAdmins} />
    </div>
  );
}

// ==============================
// Tab 2: Sales Pipeline
// ==============================

function SalesPipelineContent() {
  const stats = getSalesPipelineStats();

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
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            🤝 Sales Pipeline — Deals ทั้งหมด
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            ติดตามทุก Deal ตั้งแต่ Prospect จนถึง Won
          </p>
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
              {mockDeals.map((deal) => {
                const services = deal.services.map(
                  (sid) =>
                    serviceProducts.find((s) => s.id === sid)?.shortName || sid
                );
                return (
                  <tr
                    key={deal.id}
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
                        {services.map((s) => (
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

function ServiceCatalogContent() {
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
          {serviceProducts.map((svc) => (
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
