"use client";

import {
  Admin,
  getCommission,
  formatCurrency,
} from "@/lib/mock-data";
import { Wallet, TrendingUp, AlertTriangle, Users } from "lucide-react";

interface Props {
  admins: Admin[];
}

const BASE_SALARY = 10000;

export default function PayrollSummary({ admins }: Props) {
  const totalBaseSalary = BASE_SALARY * admins.length;
  const totalCommission = admins.reduce(
    (sum, a) => sum + getCommission(a.closeRate),
    0
  );
  const totalPayroll = totalBaseSalary + totalCommission;
  const passCount = admins.filter((a) => a.closeRate >= 30).length;
  const failCount = admins.filter((a) => a.closeRate < 30).length;

  const cards = [
    {
      label: "เงินเดือนฐานรวม",
      value: formatCurrency(totalBaseSalary),
      sub: `${admins.length} คน × ${formatCurrency(BASE_SALARY)}`,
      icon: Users,
      color: "text-blue-400",
      bg: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "Commission รวม",
      value: formatCurrency(totalCommission),
      sub: `จาก ${passCount} คนที่ได้โบนัส`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "ยอดจ่ายสุทธิ",
      value: formatCurrency(totalPayroll),
      sub: "เงินเดือน + Commission",
      icon: Wallet,
      color: "text-gold-400",
      bg: "from-gold-500/20 to-gold-500/5",
    },
    {
      label: "ต่ำกว่าเกณฑ์",
      value: `${failCount} คน`,
      sub: failCount > 0 ? "ต้องเข้า PIP" : "ไม่มี — ดีเยี่ยม!",
      icon: AlertTriangle,
      color: failCount > 0 ? "text-red-400" : "text-emerald-400",
      bg:
        failCount > 0
          ? "from-red-500/20 to-red-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
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
  );
}
