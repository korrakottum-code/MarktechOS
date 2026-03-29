"use client";

import { AdsMetric, mockAdsMetrics } from "@/lib/mock-operations";
import { formatCurrency, formatNumber } from "@/lib/mock-data";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function AdsPerformance() {
  const activeAds = mockAdsMetrics.filter((a) => a.status === "active");
  const pausedAds = mockAdsMetrics.filter((a) => a.status !== "active");

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          📈 Ads Performance — แคมเปญทั้งหมด
        </h2>
        <p className="text-sm text-foreground-muted mt-1">
          {activeAds.length} active · {pausedAds.length} paused/ended
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border">
              <th className="px-6 py-3 font-medium">คลินิก</th>
              <th className="px-6 py-3 font-medium">แคมเปญ</th>
              <th className="px-6 py-3 font-medium text-center">สถานะ</th>
              <th className="px-6 py-3 font-medium text-right">งบใช้ไป</th>
              <th className="px-6 py-3 font-medium text-right">Lead</th>
              <th className="px-6 py-3 font-medium text-right">CPL</th>
              <th className="px-6 py-3 font-medium text-right">ROAS</th>
              <th className="px-6 py-3 font-medium text-right">Impressions</th>
              <th className="px-6 py-3 font-medium text-right">CTR</th>
            </tr>
          </thead>
          <tbody>
            {mockAdsMetrics
              .sort((a, b) => b.roas - a.roas)
              .map((ad) => (
                <tr
                  key={ad.id}
                  className="border-b border-border/30 hover:bg-navy-800/50 transition-colors"
                >
                  <td className="px-6 py-3 text-foreground font-medium">
                    {ad.clinic}
                  </td>
                  <td className="px-6 py-3 text-foreground-muted">
                    {ad.campaign}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-lg ${
                        ad.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : ad.status === "paused"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {ad.status === "active"
                        ? "🟢 Active"
                        : ad.status === "paused"
                        ? "⏸️ Paused"
                        : "⏹️ Ended"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-foreground">
                    {formatCurrency(ad.spend)}
                  </td>
                  <td className="px-6 py-3 text-right text-foreground">
                    {ad.leads}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`font-medium ${
                        ad.cpl < 500
                          ? "text-emerald-400"
                          : ad.cpl < 1000
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(ad.cpl)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ad.roas >= 3 ? (
                        <TrendingUp size={14} className="text-emerald-400" />
                      ) : ad.roas < 2 ? (
                        <TrendingDown size={14} className="text-red-400" />
                      ) : null}
                      <span
                        className={`font-bold ${
                          ad.roas >= 3
                            ? "text-emerald-400"
                            : ad.roas >= 2
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {ad.roas}x
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-foreground-muted">
                    {formatNumber(ad.impressions)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`${
                        ad.ctr >= 2
                          ? "text-emerald-400"
                          : ad.ctr >= 1
                          ? "text-foreground"
                          : "text-red-400"
                      }`}
                    >
                      {ad.ctr}%
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
