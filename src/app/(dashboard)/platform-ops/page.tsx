"use client";

import { useMemo, useState } from "react";
import type { RecipientConfig, Admin, ClientProfile, HRPolicy } from "@/lib/app-data-types";
import { 
  getBackupStatusColor, 
  getBackupStatusLabel, 
  formatCurrency 
} from "@/lib/app-utils";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import StaffManagementPanel from "@/components/hr/StaffManagementPanel";
import MarkTechDatePicker from "@/components/ui/DatePicker";
import {
  Database,
  FileBarChart,
  ShieldAlert,
  Mail,
  Download,
  Link2,
  Globe,
  TrendingUp,
  Clock,
  Filter,
  Calendar,
} from "lucide-react";

export default function PlatformOpsPage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const [activeTab, setActiveTab] = useState<"system" | "staff">("system");
  const [filterMonth, setFilterMonth] = useState(new Date());
  const [filterRange, setFilterRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });
  
  const stats = payload?.stats.platform;
  const backupPolicy = payload?.data.backupPolicy;
  const backupLogs = payload?.data.backupLogs ?? [];
  const monthlyReports = payload?.data.monthlyReports ?? [];
  const recipientConfigs = payload?.data.recipientConfigs ?? [];
  const clinics = payload?.data.clinicClients ?? [];
  const admins = payload?.data.admins ?? [];
  const hrAlerts = payload?.data.hrAlerts ?? [];
  const hrPolicy = payload?.data.hrPolicy ?? { lateThreshold: 5, absentThreshold: 3, closeRatePipThreshold: 30, responseTimeSla: 15, autoEscalateToCeo: true };
  const notifications = payload?.data.notifications ?? [];
  const clients = payload?.data.clients ?? [];

  const updateRecipientConfig = (
    id: string,
    updater: (current: RecipientConfig) => RecipientConfig
  ) => {
    const nextConfigs = recipientConfigs.map((config) => 
      config.id === id ? updater(config) : config
    );
    patchSection("recipientConfigs", nextConfigs);
  };

  const activeRecipients = useMemo(
    () =>
      recipientConfigs
        .filter((config) => config.enabled)
        .flatMap((config) => config.emails)
        .filter((email, idx, arr) => arr.indexOf(email) === idx),
    [recipientConfigs]
  );

  const handleExportReport = (report: (typeof monthlyReports)[number]) => {
    const body = [
      `Monthly Executive Report — ${report.monthLabel}`,
      "",
      `Generated At: ${new Date(report.generatedAt).toLocaleString("th-TH")}`,
      `Total Revenue: ${formatCurrency(report.totalRevenue)}`,
      `Net Profit: ${formatCurrency(report.netProfit)}`,
      `Close Rate: ${report.avgCloseRate}%`,
      `ROAS: ${report.avgRoas}x`,
      `SLA Rate: ${report.slaRate}%`,
      "",
      "Action Items:",
      ...report.actionItems.map((item) => `- ${item}`),
      "",
      `Recipients: ${activeRecipients.join(", ") || "ไม่ระบุผู้รับ"}`,
      `Dashboard Link: https://marktech-os.local/platform-ops?report=${report.id}`,
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `executive-report-${report.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async (reportId: string) => {
    const link = `https://marktech-os.local/platform-ops?report=${reportId}`;
    await navigator.clipboard.writeText(link);
  };

  const updateClinicMeta = async (clinicName: string, fields: { facebookPageId?: string; facebookAdAccountId?: string }) => {
    const updatedClinics = clinics.map(c => 
      c.name === clinicName ? { ...c, ...fields } : c
    );
    patchSection("clinicClients", updatedClinics);
  };

  const handleToggleHRAlert = (id: string) => {
    const updated = hrAlerts.map(a => a.id === id ? { ...a, actionTaken: true } : a);
    patchSection("hrAlerts", updated);
  };

  const handleSaveStaff = (admin: any) => {
    const exists = admins.find(a => a.id === admin.id);
    let nextAdmins;
    if (exists) {
      nextAdmins = admins.map(a => a.id === admin.id ? admin : a);
    } else {
      nextAdmins = [...admins, admin];
    }
    patchSection("admins", nextAdmins);
  };

  const handleDeleteStaff = (id: string) => {
    const nextAdmins = admins.filter(a => a.id !== id);
    patchSection("admins", nextAdmins);
  };

  const handleSavePolicy = (policy: any) => {
    patchSection("hrPolicy", policy);
  };

  if (loading || !stats || !backupPolicy) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const statCards = [
    {
      label: "Backup สำเร็จ (14 วัน)",
      value: stats.successCount.toString(),
      sub: `เตือน ${stats.warningCount} · ล้มเหลว ${stats.failedCount}`,
      icon: Database,
      color: stats.failedCount > 0 ? "text-amber-400" : "text-emerald-400",
      bg:
        stats.failedCount > 0
          ? "from-amber-500/20 to-amber-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "รายงานล่าสุด",
      value: stats.latestReport.monthLabel,
      sub: `รายรับ ${formatCurrency(stats.latestReport.totalRevenue)}`,
      icon: FileBarChart,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "กำไรสุทธิรายงานล่าสุด",
      value: formatCurrency(stats.latestReport.netProfit),
      sub: `SLA เฉลี่ย ${stats.avgSlaRate}%`,
      icon: ShieldAlert,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "คิวส่งรายงาน",
      value: `${stats.queuedReports} รายการ`,
      sub: "รอบส่งวันที่ 1 ของเดือน",
      icon: Mail,
      color: stats.queuedReports > 0 ? "text-amber-400" : "text-emerald-400",
      bg:
        stats.queuedReports > 0
          ? "from-amber-500/20 to-amber-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            ⚙️ Platform Ops & Personnel
          </h1>
          <p className="text-foreground-muted mt-1">
            Infrastructure Monitoring · Staff Performance · HR Risk Management
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-navy-900 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "system"
                ? "bg-gold-500 text-navy-950 shadow-lg"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            System Ops
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "staff"
                ? "bg-gold-500 text-navy-950 shadow-lg"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Staff Management
          </button>
        </div>
      </div>

      {/* Global Filter Bar - Showcasing the 3 DatePicker Modes */}
      <div className="bg-navy-900/50 border border-border/50 rounded-3xl p-4 flex flex-wrap items-center gap-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gold-400" />
          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Global Filters:</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-muted uppercase">By Month:</span>
            <MarkTechDatePicker 
              mode="month" 
              value={filterMonth} 
              onChange={setFilterMonth} 
              className="w-48"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground-muted uppercase">By Range:</span>
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
           <span className="text-xs text-foreground font-medium">Viewing Data for <span className="text-gold-400 font-bold">{filterMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></span>
        </div>
      </div>

      {activeTab === "system" ? (
        <div className="space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="stat-card"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center`}
                    >
                      <Icon size={20} className={card.color} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{card.value}</p>
                      <p className="text-xs text-foreground-muted">{card.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
                </div>
              );
            })}
          </div>

      {/* ③ Clinic Facebook Integration Section */}
      <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "240ms" }}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe size={20} className="text-blue-400" />
              Clinic Facebook Integration (Mapping)
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              ระบุ Page ID และ Ad Account ID เพื่อรับ Leads และติดตามงบโฆษณาเรียลไทม์ (20 คลินิก)
            </p>
          </div>
          <button 
            onClick={() => fetch("/api/cron/sync-ads").then(r => r.json()).then(d => alert(d.message || "Sync Complete"))}
            className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/20 transition-all flex items-center gap-2"
          >
            <TrendingUp size={16} />
            Sync All Ad Spend
          </button>
        </div>

        <div className="overflow-x-auto text-left">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-muted border-b border-border bg-navy-900/50">
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Clinic Name</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Facebook Page ID</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Ad Account ID</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-navy-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{clinic.name}</p>
                    <p className="text-[10px] text-foreground-muted lowercase">clinic.marktech.co/{clinic.name.toLowerCase().replace(/\s+/g, '-')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      defaultValue={(clinic as any).facebookPageId || ""}
                      onBlur={(e) => updateClinicMeta(clinic.name, { facebookPageId: e.target.value })}
                      placeholder="e.g. 1029384756"
                      className="bg-navy-900 border border-border rounded-lg px-3 py-2 text-xs text-foreground w-48 focus:border-blue-500/50 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      defaultValue={(clinic as any).facebookAdAccountId || ""}
                      onBlur={(e) => updateClinicMeta(clinic.name, { facebookAdAccountId: e.target.value })}
                      placeholder="act_123456789"
                      className="bg-navy-900 border border-border rounded-lg px-3 py-2 text-xs text-foreground w-48 focus:border-blue-500/50 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-[10px] px-2 py-1 rounded-full ${(clinic as any).facebookPageId ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {(clinic as any).facebookPageId ? "CONNECTED" : "DISCONNECTED"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-navy-900 border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              ① Auto Daily Backup Health
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              Schedule: {backupPolicy.schedule} · Primary: {backupPolicy.primaryStorage} · Secondary: {backupPolicy.secondaryStorage}
            </p>
          </div>

          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-border bg-navy-900/60">
            <div className="bg-navy-800 rounded-xl p-3">
              <p className="text-[11px] text-foreground-muted">Retention Daily</p>
              <p className="text-sm text-foreground mt-1">{backupPolicy.retentionDaily}</p>
            </div>
            <div className="bg-navy-800 rounded-xl p-3">
              <p className="text-[11px] text-foreground-muted">Retention Monthly</p>
              <p className="text-sm text-foreground mt-1">{backupPolicy.retentionMonthly}</p>
            </div>
            <div className="bg-navy-800 rounded-xl p-3">
              <p className="text-[11px] text-foreground-muted">Retention Yearly</p>
              <p className="text-sm text-foreground mt-1">{backupPolicy.retentionYearly}</p>
            </div>
            <div className="bg-navy-800 rounded-xl p-3">
              <p className="text-[11px] text-foreground-muted">Next Run</p>
              <p className="text-sm text-foreground mt-1">
                {new Date(backupPolicy.nextRunAt).toLocaleString("th-TH", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto text-left">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">เวลาเริ่ม</th>
                  <th className="px-6 py-3 font-medium text-center">สถานะ</th>
                  <th className="px-6 py-3 font-medium text-right">ขนาด</th>
                  <th className="px-6 py-3 font-medium text-right">Records</th>
                  <th className="px-6 py-3 font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {backupLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/30 hover:bg-navy-800/40 transition-colors">
                    <td className="px-6 py-3 text-foreground-muted text-xs">
                      {new Date(log.startedAt).toLocaleString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-[11px] px-2 py-1 rounded-lg border ${getBackupStatusColor(log.status)}`}>
                        {getBackupStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-foreground">{log.sizeGb.toFixed(2)} GB</td>
                    <td className="px-6 py-3 text-right text-foreground">
                      {new Intl.NumberFormat("th-TH").format(log.recordsCount)}
                    </td>
                    <td className="px-6 py-3 text-xs text-foreground-muted">
                      {log.errorMessage || "สำรองครบทั้ง 2 region"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2 bg-navy-900 border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-navy-900/70">
            <h2 className="text-base font-semibold text-foreground">
              Recipient Management
            </h2>
            <p className="text-xs text-foreground-muted mt-1">
              ปรับผู้รับรายงานตามบทบาท และกำหนดอีเมลปลายทาง
            </p>
          </div>

          <div className="px-5 py-4 space-y-3 border-b border-border bg-navy-900/30">
            {recipientConfigs.map((config) => (
              <div key={config.id} className="rounded-xl border border-border bg-navy-800/60 p-3">
                <div className="flex items-center justify-between gap-3 text-left">
                  <div>
                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">{config.scope}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) =>
                        updateRecipientConfig(config.id, (current) => ({
                          ...current,
                          enabled: e.target.checked,
                        }))
                      }
                      className="accent-gold-400"
                    />
                    เปิดใช้งาน
                  </label>
                </div>
                <input
                  type="text"
                  value={config.emails.join(", ")}
                  onChange={(e) =>
                    updateRecipientConfig(config.id, (current) => ({
                      ...current,
                      emails: e.target.value
                        .split(",")
                        .map((email) => email.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-3 w-full bg-navy-900 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-gold-500/50"
                  placeholder="email1@company.com, email2@company.com"
                />
              </div>
            ))}
            <p className="text-[11px] text-foreground-muted text-left">
              Active Recipients: {activeRecipients.join(", ") || "ยังไม่มีผู้รับที่เปิดใช้งาน"}
            </p>
          </div>

          <div className="px-5 py-4 border-b border-border text-left">
            <h2 className="text-lg font-semibold text-foreground">
              ② Monthly Executive Report Archive
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              ส่งอีเมลอัตโนมัติทุกวันที่ 1 พร้อม action items
            </p>
          </div>

          <div className="divide-y divide-border/30 max-h-[38rem] overflow-y-auto text-left">
            {monthlyReports.map((report) => (
              <div key={report.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{report.monthLabel}</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Generate {new Date(report.generatedAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full ${
                      report.status === "sent"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {report.status === "sent" ? "ส่งแล้ว" : "รอส่ง"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-navy-800 rounded-lg p-2.5">
                    <p className="text-foreground-muted">รายรับรวม</p>
                    <p className="text-foreground font-semibold mt-1">
                      {formatCurrency(report.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-navy-800 rounded-lg p-2.5">
                    <p className="text-foreground-muted">กำไรสุทธิ</p>
                    <p className="text-emerald-400 font-semibold mt-1">
                      {formatCurrency(report.netProfit)}
                    </p>
                  </div>
                  <div className="bg-navy-800 rounded-lg p-2.5">
                    <p className="text-foreground-muted">Close Rate</p>
                    <p className="text-blue-400 font-semibold mt-1">{report.avgCloseRate}%</p>
                  </div>
                  <div className="bg-navy-800 rounded-lg p-2.5">
                    <p className="text-foreground-muted">ROAS / SLA</p>
                    <p className="text-gold-400 font-semibold mt-1">
                      {report.avgRoas}x · {report.slaRate}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-foreground-muted mb-1 flex items-center gap-1">
                    <Clock size={12} /> Action Items
                  </p>
                  <div className="space-y-1">
                    {report.actionItems.map((item) => (
                      <p key={item} className="text-xs text-foreground-muted">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-foreground-muted">
                  Recipients: {activeRecipients.join(", ") || report.recipients.join(", ")}
                </p>

                <div className="flex items-center gap-2 pt-1 text-left">
                  <button
                    onClick={() => handleExportReport(report)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs hover:bg-gold-500/20 transition-colors"
                  >
                    <Download size={12} /> Export
                  </button>
                  <button
                    onClick={() => void handleCopyLink(report.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-navy-700 border border-border text-foreground-muted text-xs hover:text-foreground transition-colors"
                  >
                    <Link2 size={12} /> Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <StaffManagementPanel 
      admins={admins} 
      hrAlerts={hrAlerts} 
      onToggleAlert={handleToggleHRAlert}
      clients={clients}
      onSaveStaff={handleSaveStaff}
      onDeleteStaff={handleDeleteStaff}
      hrPolicy={hrPolicy}
      onSavePolicy={handleSavePolicy}
    />
  )}
</div>
);
}
