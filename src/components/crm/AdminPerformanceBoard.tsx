"use client";

import {
  Admin,
  getTierLabel,
  getTierBg,
  formatCurrency,
  getMotivationalMessage,
  getCommission,
} from "@/lib/mock-data";

interface Props {
  admins: Admin[];
}

export default function AdminPerformanceBoard({ admins }: Props) {
  const sorted = [...admins].sort((a, b) => b.closeRate - a.closeRate);

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          🏆 Performance Board — แอดมินทั้งหมด
        </h2>
        <p className="text-sm text-foreground-muted mt-1">
          เรียงตาม Close Rate สูงสุด → ต่ำสุด
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border">
              <th className="px-6 py-3 font-medium">#</th>
              <th className="px-6 py-3 font-medium">แอดมิน</th>
              <th className="px-6 py-3 font-medium">สถานะ</th>
              <th className="px-6 py-3 font-medium text-center">
                Lead รับ/ปิด
              </th>
              <th className="px-6 py-3 font-medium text-center">Close Rate</th>
              <th className="px-6 py-3 font-medium text-center">
                เวลาตอบเฉลี่ย
              </th>
              <th className="px-6 py-3 font-medium text-center">Tier</th>
              <th className="px-6 py-3 font-medium text-right">โบนัส</th>
              <th className="px-6 py-3 font-medium text-right">รายได้</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((admin, i) => {
              const commission = getCommission(admin.closeRate);
              const isBelowThreshold = admin.closeRate < 30;

              return (
                <tr
                  key={admin.id}
                  className={`border-b border-border/50 hover:bg-navy-800/50 transition-colors animate-fade-in ${
                    isBelowThreshold ? "bg-red-500/5" : ""
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Rank */}
                  <td className="px-6 py-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-gold-500 text-navy-950"
                          : i === 1
                          ? "bg-gray-300 text-navy-950"
                          : i === 2
                          ? "bg-orange-400 text-navy-950"
                          : "bg-navy-700 text-foreground-muted"
                      }`}
                    >
                      {i + 1}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-foreground">
                        {admin.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {admin.name}
                        </p>
                        <p className="text-[11px] text-foreground-muted">
                          {getMotivationalMessage(admin.closeRate)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          admin.status === "online"
                            ? "bg-emerald-400"
                            : admin.status === "busy"
                            ? "bg-amber-400"
                            : "bg-gray-500"
                        }`}
                      />
                      <span className="text-foreground-muted text-xs">
                        {admin.status === "online"
                          ? "ออนไลน์"
                          : admin.status === "busy"
                          ? "ไม่ว่าง"
                          : "ออฟไลน์"}
                      </span>
                    </div>
                  </td>

                  {/* Leads */}
                  <td className="px-6 py-3 text-center text-foreground">
                    {admin.leadsClosed}/{admin.leadsReceived}
                  </td>

                  {/* Close Rate */}
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-navy-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            admin.closeRate >= 50
                              ? "bg-yellow-400"
                              : admin.closeRate >= 40
                              ? "bg-emerald-400"
                              : admin.closeRate >= 30
                              ? "bg-blue-400"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${Math.min(admin.closeRate, 100)}%` }}
                        />
                      </div>
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
                    </div>
                  </td>

                  {/* Response Time */}
                  <td className="px-6 py-3 text-center text-foreground">
                    {admin.avgResponseTime} นาที
                  </td>

                  {/* Tier */}
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg border ${getTierBg(
                        admin.tier
                      )}`}
                    >
                      {getTierLabel(admin.tier)}
                    </span>
                  </td>

                  {/* Commission */}
                  <td className="px-6 py-3 text-right">
                    {commission > 0 ? (
                      <span className="text-emerald-400 font-medium">
                        +{formatCurrency(commission)}
                      </span>
                    ) : (
                      <span className="text-foreground-muted">—</span>
                    )}
                  </td>

                  {/* Revenue */}
                  <td className="px-6 py-3 text-right font-medium text-foreground">
                    {formatCurrency(admin.revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
