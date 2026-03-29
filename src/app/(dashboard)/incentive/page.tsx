"use client";

import { mockAdmins, formatCurrency } from "@/lib/mock-data";
import CommissionTable from "@/components/incentive/CommissionTable";
import PayrollSummary from "@/components/incentive/PayrollSummary";

export default function IncentivePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          💰 Incentive & Commission
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-normal">
            Module 4
          </span>
        </h1>
        <p className="text-foreground-muted mt-1">
          คำนวณค่าคอมมิชชัน + เงินเดือนรวมอัตโนมัติ สำหรับเดือน{" "}
          {new Date().toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Payroll Summary */}
      <PayrollSummary admins={mockAdmins} />

      {/* Commission Table */}
      <CommissionTable admins={mockAdmins} />
    </div>
  );
}
