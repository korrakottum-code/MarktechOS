"use client";

import {
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { getDashboardStats, formatCurrency, mockAdmins } from "@/lib/mock-data";
import Link from "next/link";

export default function DashboardPage() {
  const stats = getDashboardStats();

  const statCards = [
    {
      label: "รายได้รวมเดือนนี้",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      change: "+12.5%",
      positive: true,
      color: "from-gold-500/20 to-gold-500/5",
      iconColor: "text-gold-400",
    },
    {
      label: "Lead ทั้งหมด",
      value: stats.totalLeads.toString(),
      icon: MessageSquare,
      change: `${stats.newLeads} ใหม่`,
      positive: true,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
    },
    {
      label: "Close Rate เฉลี่ย",
      value: `${stats.avgCloseRate}%`,
      icon: TrendingUp,
      change: "+2.3%",
      positive: true,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
    {
      label: "แอดมินออนไลน์",
      value: `${stats.onlineAdmins}/${stats.totalAdmins}`,
      icon: Users,
      change: `${stats.belowThreshold} ต่ำกว่าเกณฑ์`,
      positive: stats.belowThreshold === 0,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
    },
  ];

  const topAdmins = [...mockAdmins]
    .sort((a, b) => b.closeRate - a.closeRate)
    .slice(0, 5);

  const alertAdmins = mockAdmins.filter((a) => a.closeRate < 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            สวัสดี, คุณตั้ม 👋
          </h1>
          <p className="text-foreground-muted mt-1">
            ภาพรวมระบบ Marktech OS วันนี้
          </p>
        </div>
        <div className="text-sm text-foreground-muted">
          {new Date().toLocaleDateString("th-TH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}
                >
                  <Icon size={20} className={card.iconColor} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    card.positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {card.positive ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {card.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {card.value}
                </p>
                <p className="text-sm text-foreground-muted mt-1">
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="lg:col-span-2 bg-navy-900 border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-gold-400" />
              Top 5 แอดมินผลงานดีเด่น
            </h2>
            <Link
              href="/admin-crm"
              className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-3">
            {topAdmins.map((admin, i) => (
              <div
                key={admin.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-navy-800/50 hover:bg-navy-800 transition-colors animate-fade-in"
                style={{ animationDelay: `${(i + 4) * 80}ms` }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-gold-500 to-gold-300 text-navy-950">
                  {i + 1}
                </div>
                <div className="w-9 h-9 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-foreground">
                  {admin.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {admin.name}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {admin.leadsClosed}/{admin.leadsReceived} Lead
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">
                    {admin.closeRate}%
                  </p>
                  <p className="text-xs text-foreground-muted">Close Rate</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(admin.revenue)}
                  </p>
                  <p className="text-xs text-foreground-muted">รายได้</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-navy-900 border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-danger" />
            แจ้งเตือน
          </h2>
          <div className="space-y-3">
            {alertAdmins.length > 0 ? (
              alertAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                >
                  <p className="text-sm text-foreground">
                    ⚠️ <strong>{admin.name}</strong>
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Close Rate {admin.closeRate}% — ต่ำกว่าเกณฑ์ 30%
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-foreground-muted">
                <p className="text-3xl mb-2">✨</p>
                <p className="text-sm">ไม่มีแจ้งเตือนวันนี้</p>
              </div>
            )}

            {/* Quick Links */}
            <div className="pt-4 mt-4 border-t border-border space-y-2">
              <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">
                ทางลัด
              </p>
              <Link
                href="/admin-crm"
                className="block p-3 rounded-xl bg-navy-800 hover:bg-navy-700 transition-colors text-sm text-foreground"
              >
                📊 Admin CRM Dashboard
              </Link>
              <Link
                href="/incentive"
                className="block p-3 rounded-xl bg-navy-800 hover:bg-navy-700 transition-colors text-sm text-foreground"
              >
                💰 คำนวณ Commission
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
