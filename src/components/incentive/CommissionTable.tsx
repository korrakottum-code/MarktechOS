"use client";

import type { Admin } from "@/lib/app-data-types";
import {
  getCommission,
  getTierLabel,
  getTierBg,
  formatCurrency,
} from "@/lib/app-utils";
import { Download } from "lucide-react";

interface Props {
  admins: Admin[];
}

const BASE_SALARY = 10000;

export default function CommissionTable({ admins }: Props) {
  const sorted = [...admins].sort((a, b) => b.closeRate - a.closeRate);

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            📊 ตารางคำนวณ Commission รายบุคคล
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            ฐานเงินเดือน ฿10,000 + Commission ตาม Tier
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-xl text-sm text-gold-400 hover:bg-gold-500/20 transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border">
              <th className="px-6 py-3 font-medium">#</th>
              <th className="px-6 py-3 font-medium">ชื่อ</th>
              <th className="px-6 py-3 font-medium text-center">Close Rate</th>
              <th className="px-6 py-3 font-medium text-center">Tier</th>
              <th className="px-6 py-3 font-medium text-right">เงินเดือนฐาน</th>
              <th className="px-6 py-3 font-medium text-right">Commission</th>
              <th className="px-6 py-3 font-medium text-right">
                รวมสุทธิ
              </th>
              <th className="px-6 py-3 font-medium text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? sorted.map((admin, i) => {
              const commission = getCommission(admin.closeRate);
              const total = BASE_SALARY + commission;
              const isBelowThreshold = admin.closeRate < 30;

              return (
                <tr
                  key={admin.id}
                  className={`border-b border-border/30 hover:bg-navy-800/50 transition-colors animate-fade-in ${
                    isBelowThreshold ? "bg-red-500/5" : ""
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-6 py-3 text-foreground-muted">{i + 1}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-foreground">
                        {admin.avatar}
                      </div>
                      <span className="font-medium text-foreground">
                        {admin.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`font-bold ${
                        admin.closeRate >= 50
                          ? "text-yellow-400"
                          : admin.closeRate >= 40
                          ? "text-emerald-400"
                          : admin.closeRate >= 30
                          ? "text-blue-400"
                          : "text-red-400"
                      }`}
                    >
                      {admin.closeRate}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`text-[11px] px-2 py-1 rounded-lg border ${getTierBg(
                        admin.tier
                      )}`}
                    >
                      {getTierLabel(admin.tier)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-foreground">
                    {formatCurrency(BASE_SALARY)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {commission > 0 ? (
                      <span className="text-emerald-400 font-medium">
                        +{formatCurrency(commission)}
                      </span>
                    ) : (
                      <span className="text-foreground-muted">฿0</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-bold text-foreground text-base">
                      {formatCurrency(total)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {isBelowThreshold ? (
                      <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400">
                        ⚠️ PIP
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                        ✅ ผ่าน
                      </span>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-foreground-muted bg-navy-900/50 italic">
                  ยังไม่มีข้อมูลรายชื่อแอดมินในระบบ
                </td>
              </tr>
            )}
          </tbody>
          {/* Footer */}
          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-navy-800/50">
                <td className="px-6 py-4" colSpan={4}>
                  <span className="font-semibold text-foreground">
                    รวมทั้งหมด ({admins.length} คน)
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-foreground">
                  {formatCurrency(BASE_SALARY * admins.length)}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                  +
                  {formatCurrency(
                    admins.reduce((sum, a) => sum + getCommission(a.closeRate), 0)
                  )}
                </td>
                <td className="px-6 py-4 text-right font-bold text-gold-400 text-base">
                  {formatCurrency(
                    admins.reduce(
                      (sum, a) => sum + BASE_SALARY + getCommission(a.closeRate),
                      0
                    )
                  )}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
