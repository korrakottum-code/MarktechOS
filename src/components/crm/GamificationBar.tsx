"use client";

import { Admin, getTier } from "@/lib/mock-data";

interface Props {
  admins: Admin[];
}

export default function GamificationBar({ admins }: Props) {
  const tiers = {
    gold: admins.filter((a) => getTier(a.closeRate) === "gold").length,
    silver: admins.filter((a) => getTier(a.closeRate) === "silver").length,
    bronze: admins.filter((a) => getTier(a.closeRate) === "bronze").length,
    none: admins.filter((a) => getTier(a.closeRate) === "none").length,
  };

  const avgRate =
    admins.reduce((sum, a) => sum + a.closeRate, 0) / admins.length;

  return (
    <div className="bg-navy-900 border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          🎮 Gamification — สถานะทีมรวม
        </h2>
        <div className="text-sm text-foreground-muted">
          Close Rate เฉลี่ย:{" "}
          <span className="text-gold-400 font-bold">
            {Math.round(avgRate)}%
          </span>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
          <p className="text-3xl mb-1">🥇</p>
          <p className="text-2xl font-bold text-yellow-400">{tiers.gold}</p>
          <p className="text-xs text-foreground-muted mt-1">
            Gold (50%+)
          </p>
        </div>
        <div className="text-center p-4 rounded-xl bg-gray-300/5 border border-gray-300/20">
          <p className="text-3xl mb-1">🥈</p>
          <p className="text-2xl font-bold text-gray-300">{tiers.silver}</p>
          <p className="text-xs text-foreground-muted mt-1">
            Silver (40-49%)
          </p>
        </div>
        <div className="text-center p-4 rounded-xl bg-orange-400/5 border border-orange-400/20">
          <p className="text-3xl mb-1">🥉</p>
          <p className="text-2xl font-bold text-orange-400">{tiers.bronze}</p>
          <p className="text-xs text-foreground-muted mt-1">
            Bronze (30-39%)
          </p>
        </div>
        <div className="text-center p-4 rounded-xl bg-red-400/5 border border-red-400/20">
          <p className="text-3xl mb-1">⚠️</p>
          <p className="text-2xl font-bold text-red-400">{tiers.none}</p>
          <p className="text-xs text-foreground-muted mt-1">
            ต่ำกว่าเกณฑ์ (&lt;30%)
          </p>
        </div>
      </div>

      {/* Team Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-foreground-muted mb-2">
          <span>เป้าหมายทีม: Close Rate เฉลี่ย ≥ 40%</span>
          <span className={avgRate >= 40 ? "text-emerald-400" : "text-amber-400"}>
            {Math.round(avgRate)}% / 40%
          </span>
        </div>
        <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden relative">
          {/* Threshold marker at 30% */}
          <div className="absolute left-[30%] top-0 bottom-0 w-px bg-red-400/50 z-10" />
          {/* Target marker at 40% */}
          <div className="absolute left-[40%] top-0 bottom-0 w-px bg-gold-400/50 z-10" />
          {/* Progress */}
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              avgRate >= 40
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : avgRate >= 30
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : "bg-gradient-to-r from-red-500 to-red-400"
            }`}
            style={{ width: `${Math.min((avgRate / 60) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-foreground-muted mt-1">
          <span>0%</span>
          <span className="text-red-400">30% เกณฑ์ขั้นต่ำ</span>
          <span className="text-gold-400">40% Silver</span>
          <span className="text-yellow-400">50% Gold</span>
          <span>60%</span>
        </div>
      </div>
    </div>
  );
}
