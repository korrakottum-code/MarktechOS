"use client";

import { useEffect, useState } from "react";

import type { AppData } from "@/lib/app-data-types";

interface AppStats {
  dashboard: {
    totalLeads: number;
    closedLeads: number;
    newLeads: number;
    totalRevenue: number;
    avgCloseRate: number;
    onlineAdmins: number;
    totalAdmins: number;
    belowThreshold: number;
  };
  sales: {
    totalDeals: number;
    wonDeals: number;
    wonValue: number;
    pipelineValue: number;
    weightedPipeline: number;
  };
  operation: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    totalAdSpend: number;
    avgCPL: number;
    avgROAS: number;
  };
  finance: {
    totalBasePayroll: number;
    totalCommission: number;
    totalDeductions: number;
    totalAllowances: number;
    netPayroll: number;
    serviceFeeInflow: number;
    adTopupInflow: number;
    adSpendOutflow: number;
    operatingExpense: number;
    netCashflow: number;
    pendingBillings: number;
    criticalWallets: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    slaBreached: number;
    slaRate: number;
  };
  timeline: {
    todayEvents: number;
    urgentEvents: number;
    thisWeek: number;
    totalEvents: number;
  };
  platform: {
    successCount: number;
    failedCount: number;
    warningCount: number;
    latestReport: AppData["monthlyReports"][number];
    avgSlaRate: number;
    queuedReports: number;
  };
}

export interface AppDataResponse {
  data: AppData;
  stats: AppStats;
}

export function useAppData() {
  const [payload, setPayload] = useState<AppDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch("/api/app-data", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }
        const json = (await response.json()) as AppDataResponse;
        if (mounted) setPayload(json);
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return { payload, loading, error, setPayload };
}
