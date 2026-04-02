import type { 
  AppData,
  Admin, 
  Lead,
  SalesDeal,
  OperationTask, 
  AdsMetric,
  AttendanceAdjustment,
  AdBudgetWallet,
  CashflowEntry,
  Ticket,
  CalendarEvent,
  FinanceSettings, 
  ClientProfile
} from "@/lib/app-data-types";
import { getCommission } from "@/lib/app-utils";

export function getDashboardStatsFromData(admins: Admin[], leads: Lead[]) {
  const totalLeads = leads.length;
  const closedLeads = leads.filter((lead) => lead.status === "closed").length;
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const totalRevenue = admins.reduce((sum, admin) => sum + admin.revenue, 0);
  const avgCloseRate =
    admins.length > 0
      ? Math.round(
          admins.reduce((sum, admin) => sum + admin.closeRate, 0) / admins.length
        )
      : 0;
  const onlineAdmins = admins.filter((admin) => admin.status === "online").length;
  const belowThreshold = admins.filter((admin) => admin.closeRate < 30).length;

  return {
    totalLeads,
    closedLeads,
    newLeads,
    totalRevenue,
    avgCloseRate,
    onlineAdmins,
    totalAdmins: admins.length,
    belowThreshold,
  };
}

export function getSalesPipelineStatsFromData(deals: SalesDeal[]) {
  const totalDeals = deals.length;
  const wonDeals = deals.filter((deal) => deal.stage === "won").length;
  const wonValue = deals
    .filter((deal) => deal.stage === "won")
    .reduce((sum, deal) => sum + deal.dealValue, 0);
  const pipelineValue = deals
    .filter((deal) => deal.stage !== "won" && deal.stage !== "lost")
    .reduce((sum, deal) => sum + deal.dealValue, 0);
  const weightedPipeline = Math.round(
    deals
      .filter((deal) => deal.stage !== "won" && deal.stage !== "lost")
      .reduce((sum, deal) => sum + deal.dealValue * (deal.probability / 100), 0)
  );

  return { totalDeals, wonDeals, wonValue, pipelineValue, weightedPipeline };
}

export function getOperationStatsFromData(tasks: OperationTask[], ads: AdsMetric[]) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;
  const overdue = tasks.filter(
    (task) =>
      task.status !== "done" &&
      new Date(task.dueDate).getTime() < new Date("2026-03-30T00:00:00.000Z").getTime()
  ).length;
  const totalAdSpend = ads.reduce((sum, metric) => sum + metric.spend, 0);
  const avgCPL =
    ads.length > 0
      ? Math.round(ads.reduce((sum, metric) => sum + metric.cpl, 0) / ads.length)
      : 0;
  const avgROAS =
    ads.length > 0
      ? +(
          ads.reduce((sum, metric) => sum + metric.roas, 0) / ads.length
        ).toFixed(2)
      : 0;

  return { total, done, inProgress, overdue, totalAdSpend, avgCPL, avgROAS };
}

export function getFinanceStatsFromData(
  admins: Admin[],
  attendance: AttendanceAdjustment[],
  wallets: AdBudgetWallet[],
  cashflow: CashflowEntry[],
  settings: FinanceSettings,
  clients: ClientProfile[]
) {
  const totalBasePayroll = 10000 * admins.length;
  const totalCommission = admins.reduce(
    (sum, admin) => sum + getCommission(admin.closeRate),
    0
  );

  const totalDeductions = attendance.reduce(
    (sum, row) => sum + row.lateDeduction + row.absentDeduction,
    0
  );
  const totalAllowances = attendance.reduce((sum, row) => sum + row.allowance, 0);

  const serviceFeeInflow = cashflow
    .filter((entry) => entry.type === "income" && entry.category === "service-fee")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const adTopupInflow = cashflow
    .filter((entry) => entry.type === "income" && entry.category === "ad-topup")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const adSpendOutflow = cashflow
    .filter((entry) => entry.type === "expense" && entry.category === "ad-spend")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const operatingExpense = cashflow
    .filter(
      (entry) =>
        entry.type === "expense" &&
        (entry.category === "operations" ||
          entry.category === "payroll" ||
          entry.category === "commission")
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalIncome = serviceFeeInflow + adTopupInflow;
  
  // Calculate P&L based on Client Economics
  const totalClientGrossProfit = clients.reduce((sum, client) => {
    const revenue = client.monthlyFee;
    const adminCost = client.adminAllocatedCost || 0;
    const prodCost = client.productionAllocatedCost || 10000;
    const adsOptShare = settings.adsOptTeamTotalSalary / (clients.length || 1);
    const comms = (revenue * (client.salesCommissionPercent || 5)) / 100;
    
    // In cashflow terms, adSpend is separate, but for Agency Profit calculation:
    const directCosts = adminCost + prodCost + adsOptShare + comms;
    return sum + (revenue - directCosts);
  }, 0);

  const globalOverhead = settings.totalOfficeOverhead + settings.generalOpsFixedSalary;
  const netCashflow = totalClientGrossProfit - globalOverhead;

  const totalExpense = adSpendOutflow + operatingExpense;

  return {
    totalBasePayroll,
    totalCommission,
    totalDeductions,
    totalAllowances,
    netPayroll: totalBasePayroll + totalCommission - totalDeductions + totalAllowances,
    serviceFeeInflow,
    adTopupInflow,
    adSpendOutflow,
    operatingExpense,
    netCashflow,
    totalClientGrossProfit,
    globalOverhead,
    pendingBillings: wallets.filter((wallet) => wallet.status !== "healthy").length,
    criticalWallets: wallets.filter((wallet) => wallet.status === "critical").length,
  };
}

export function getTicketStatsFromData(tickets: Ticket[]) {
  const total = tickets.length;
  const open = tickets.filter((ticket) => ticket.status === "open").length;
  const inProgress = tickets.filter((ticket) => ticket.status === "in-progress").length;
  const resolved = tickets.filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed"
  ).length;
  const slaBreached = tickets.filter((ticket) => ticket.slaBreached).length;
  const slaRate = total > 0 ? Math.round(((total - slaBreached) / total) * 100) : 0;

  return { total, open, inProgress, resolved, slaBreached, slaRate };
}

export function getTimelineStatsFromData(events: CalendarEvent[]) {
  const today = "2026-03-30";
  const todayEvents = events.filter((event) => event.date === today).length;
  const urgentEvents = events.filter((event) => event.priority === "urgent").length;
  const start = new Date("2026-03-30");
  const end = new Date("2026-04-06");
  const thisWeek = events.filter((event) => {
    const date = new Date(event.date);
    return date >= start && date < end;
  }).length;

  return { todayEvents, urgentEvents, thisWeek, totalEvents: events.length };
}

export function getPlatformOpsStatsFromData(data: AppData) {
  const successCount = data.backupLogs.filter((log) => log.status === "success").length;
  const failedCount = data.backupLogs.filter((log) => log.status === "failed").length;
  const warningCount = data.backupLogs.filter((log) => log.status === "warning").length;

  const latestReport = data.monthlyReports[0] || {
    id: "placeholder",
    monthLabel: "ไม่มีรายงาน",
    generatedAt: new Date().toISOString(),
    totalRevenue: 0,
    netProfit: 0,
    avgCloseRate: 0,
    avgRoas: 0,
    slaRate: 0,
    recipients: [],
    status: "draft" as const,
    actionItems: [],
  };
  const avgSlaRate =
    data.monthlyReports.length > 0
      ? Math.round(
          data.monthlyReports.reduce((sum, report) => sum + report.slaRate, 0) /
            data.monthlyReports.length
        )
      : 0;

  return {
    successCount,
    failedCount,
    warningCount,
    latestReport,
    avgSlaRate,
    queuedReports: data.monthlyReports.filter((report) => report.status === "queued")
      .length,
  };
}
