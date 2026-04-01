"use client";

import { formatCurrency } from "@/lib/app-utils";
import CommissionTable from "@/components/incentive/CommissionTable";
import PayrollSummary from "@/components/incentive/PayrollSummary";
import AttendanceDeductionsTable from "@/components/incentive/AttendanceDeductionsTable";
import CashflowRoutingPanel from "@/components/incentive/CashflowRoutingPanel";
import FinanceOverheadPanel from "@/components/incentive/FinanceOverheadPanel";
import InvoiceStatusTable from "@/components/incentive/InvoiceStatusTable";
import { AlertTriangle, TrendingUp, Wallet, Landmark, TrendingDown, DollarSign } from "lucide-react";
import { useAppData } from "@/lib/use-app-data";
import { useAppDataMutation } from "@/lib/use-app-data-mutation";
import MarkTechDatePicker from "@/components/ui/DatePicker";
import { useState } from "react";

export default function IncentivePage() {
  const { payload, loading, error, setPayload } = useAppData();
  const { patchSection } = useAppDataMutation(setPayload);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const stats = payload?.stats.finance;
  const admins = payload?.data.admins ?? [];
  const attendanceAdjustments = payload?.data.attendanceAdjustments ?? [];
  const adBudgetWallets = payload?.data.adBudgetWallets ?? [];
  const cashflowEntries = payload?.data.cashflowEntries ?? [];
  const invoices = payload?.data.invoices ?? [];
  const financeSettings = payload?.data.financeSettings;

  if (loading || !stats) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  const financeCards = [
    {
      label: "กระแสเงินสดสุทธิ",
      value: formatCurrency(stats.netCashflow),
      sub: `เงินเข้า ${formatCurrency(
        stats.serviceFeeInflow + stats.adTopupInflow
      )} · เงินออก ${formatCurrency(
        stats.adSpendOutflow + stats.operatingExpense
      )}`,
      icon: Wallet,
      color: stats.netCashflow >= 0 ? "text-emerald-400" : "text-red-400",
      bg:
        stats.netCashflow >= 0
          ? "from-emerald-500/20 to-emerald-500/5"
          : "from-red-500/20 to-red-500/5",
    },
    {
      label: "Payroll สุทธิ",
      value: formatCurrency(stats.netPayroll),
      sub: `ฐาน+คอม ${formatCurrency(
        stats.totalBasePayroll + stats.totalCommission
      )}`,
      icon: Landmark,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "ยอดหักเงินรวม",
      value: formatCurrency(stats.totalDeductions),
      sub: `เบี้ย/OT +${formatCurrency(stats.totalAllowances)}`,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "คลินิกต้องเฝ้าระวัง",
      value: `${stats.pendingBillings} ราย`,
      sub:
        stats.criticalWallets > 0
          ? `${stats.criticalWallets} รายงบวิกฤต`
          : "ไม่มีงบวิกฤต",
      icon: AlertTriangle,
      color: stats.criticalWallets > 0 ? "text-red-400" : "text-emerald-400",
      bg:
        stats.criticalWallets > 0
          ? "from-red-500/20 to-red-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          💰 Accounting & Finance
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
            Module 4
          </span>
        </h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-foreground-muted">
            Payroll, Attendance Deductions, Ad Spend Routing และ Cashflow แบบรวมศูนย์
          </p>
          <div className="flex items-center gap-3 bg-navy-900 border border-border/50 rounded-2xl px-4 py-2 shadow-xl backdrop-blur-sm">
            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">รอบบัญชี:</span>
            <MarkTechDatePicker 
              mode="month" 
              value={selectedMonth} 
              onChange={setSelectedMonth} 
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Finance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financeCards.map((card, i) => {
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
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-foreground-muted">{card.label}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-navy-900 border border-border rounded-2xl p-6 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
                <TrendingUp size={20} className="text-emerald-400" />
                Financial Summary
              </h2>
              <p className="text-xs text-foreground-muted">สรุปสถานะการเงินรวมของเอเจนซี่ประจำเดือน</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-navy-800 border border-border/50">
                <p className="text-[10px] text-foreground-muted uppercase tracking-widest mb-1 font-bold">ลูกหนี้ค้างชำระ (Receivables)</p>
                <div className="flex items-end justify-between">
                  <p className="text-xl font-bold text-red-400">{formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0))}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">🚨 ต้องเร่งด่วน</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-navy-800 border border-border/50">
                <p className="text-[10px] text-foreground-muted uppercase tracking-widest mb-1 font-bold">รายรับที่รอเรียกเก็บ (Pending)</p>
                <div className="flex items-end justify-between">
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0))}</p>
                  <span className="text-[10px] text-foreground-muted italic font-mono">Invoice Sent</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground-muted flex items-center gap-1.5"><TrendingDown size={14} className="text-red-400" /> ค่าจ้างพนักงานรวม</span>
                  <span className="text-foreground font-bold">{formatCurrency(stats.totalBasePayroll + stats.totalCommission)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground-muted flex items-center gap-1.5"><DollarSign size={14} className="text-amber-400" /> ค่าใช้จ่ายสำนักงาน (Fixed)</span>
                  <span className="text-foreground font-bold">{formatCurrency(financeSettings?.totalOfficeOverhead || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground-muted flex items-center gap-1.5"><AlertTriangle size={14} className="text-blue-400" /> อื่นๆ (Ad Shared Cost)</span>
                  <span className="text-foreground font-bold">{formatCurrency(financeSettings?.adsOptTeamTotalSalary || 0)}</span>
                </div>
              </div>

              <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 mt-2">
                <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1 font-bold">กำไรสุทธิคาดการณ์</p>
                <p className="text-2xl font-black text-gold-400">{formatCurrency(stats.netCashflow)}</p>
                <p className="text-[10px] text-foreground-muted mt-1 italic">* คำนวณจาก Cashflow In/Out จริงในเดือนนี้</p>
              </div>
            </div>
          </div>
          
          <PayrollSummary admins={admins} />
        </div>

        {/* Invoice Table & Collections */}
        <div className="lg:col-span-2 space-y-6">
          <InvoiceStatusTable invoices={invoices} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <AttendanceDeductionsTable rows={attendanceAdjustments} patchSection={patchSection} />
             <FinanceOverheadPanel 
                settings={financeSettings || { adsOptTeamTotalSalary: 0, totalOfficeOverhead: 0, generalOpsFixedSalary: 0 }} 
                onSave={(settings) => patchSection("financeSettings", settings)} 
              />
          </div>
        </div>
      </div>

      {/* Commission & Routing */}
      <div className="grid grid-cols-1 gap-6">
        <CommissionTable admins={admins} />
        <CashflowRoutingPanel wallets={adBudgetWallets} entries={cashflowEntries} patchSection={patchSection} />
      </div>
    </div>
  );
}
