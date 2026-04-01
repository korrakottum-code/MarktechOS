import "server-only";

import type { 
  AppData, 
  AppNotification, 
  Admin, 
  Lead, 
  ClinicClient, 
  ServiceProduct, 
  SalesDeal, 
  OperationTask, 
  AdsMetric, 
  ClientProfile, 
  HRAlert, 
  MonthlyPnL, 
  FinanceSettings, 
  AttendanceAdjustment, 
  AdBudgetWallet, 
  CashflowEntry, 
  Invoice, 
  Ticket, 
  CalendarEvent, 
  BackupJobLog, 
  MonthlyExecutiveReport, 
  RecipientConfig, 
  QuickAction,
  AIKnowledgeEntry
} from "@/lib/app-data-types";
import { prisma } from "@/lib/server/prisma";

export async function getAppData(): Promise<AppData> {
  try {
    // Fetch all data from SQL tables in parallel for performance
    const [
      staff,
      clinics,
      leads,
      services,
      salesDeals,
      operationTasks,
      adsMetrics,
      clientProfiles,
      hrAlerts,
      attendanceAdjustments,
      wallets,
      cashflow,
      tickets,
      events,
      notifications,
      aiKnowledge,
      invoices,
      backupLogs,
      monthlyReports,
      recipientConfigs,
      aiQuickActions,
      financeSettings
    ] = await Promise.all([
      prisma.staff.findMany({ orderBy: { name: 'asc' } }),
      prisma.clinic.findMany({ orderBy: { name: 'asc' } }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.service.findMany({ orderBy: { name: 'asc' } }),
      prisma.salesDeal.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.operationTask.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.adsMetric.findMany({ orderBy: { clinicName: 'asc' } }),
      prisma.clientProfile.findMany(),
      prisma.hRAlert.findMany({ orderBy: { date: 'desc' } }),
      prisma.attendanceAdjustment.findMany(),
      prisma.adBudgetWallet.findMany(),
      prisma.cashflowEntry.findMany({ orderBy: { date: 'desc' } }),
      prisma.ticket.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.calendarEvent.findMany({ orderBy: { date: 'desc' } }),
      prisma.appNotification.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.aIKnowledge.findMany(),
      prisma.invoice.findMany({ orderBy: { issueDate: 'desc' } }),
      prisma.backupJobLog.findMany({ orderBy: { startedAt: 'desc' } }),
      prisma.monthlyExecutiveReport.findMany({ orderBy: { generatedAt: 'desc' } }),
      prisma.recipientConfig.findMany({ orderBy: { label: 'asc' } }),
      prisma.aIQuickAction.findMany({ orderBy: { label: 'asc' } }),
      prisma.financeSettings.findUnique({ where: { id: "singleton" } })
    ]);

    const fSettings: FinanceSettings = financeSettings || { 
      adsOptTeamTotalSalary: 60000, 
      totalOfficeOverhead: 45000, 
      generalOpsFixedSalary: 35000 
    };

    // Map SQL models to AppData interface
    return {
      admins: staff.map(s => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        role: s.role as any,
        leadsReceived: s.leadsReceived,
        leadsClosed: s.leadsClosed,
        closeRate: s.closeRate,
        avgResponseTime: s.avgResponseTime,
        revenue: s.revenue,
        tier: s.tier as any,
        status: s.status as any,
        managedClinics: s.managedClinics,
      })),
      leads: leads.map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        channel: l.channel as any,
        clinic: l.clinicName,
        procedure: l.procedure,
        status: l.status as any,
        assignedTo: l.assignedToId || "",
        createdAt: l.createdAt.toISOString(),
        value: l.value,
        notes: l.notes || "",
      })),
      clinicClients: clinics.map(c => {
        const profile = clientProfiles.find(p => p.clinicName === c.name);
        return {
          id: c.id,
          name: c.name,
          revenue: c.revenue,
          adSpend: c.adSpend,
          profit: c.profit,
          leads: c.leadsCount,
          closeRate: c.closeRate,
          facebookPageId: c.facebookPageId || undefined,
          facebookAdAccountId: c.facebookAdAccountId || undefined,
          adBillingType: profile?.status === "agency" ? "agency" : "direct",
          manualAdminCost: 0,
          manualProductionCost: 0,
          salesCommission: 0,
        };
      }),
      serviceProducts: services.map(s => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        icon: s.icon,
        description: s.description,
        features: s.features as any,
        priceLabel: s.priceLabel,
        category: s.category as any,
        activeClients: s.activeClients,
      })),
      salesDeals: salesDeals.map(d => ({
        id: d.id,
        businessName: d.businessName,
        contactPerson: d.contactPerson,
        phone: d.phone,
        businessType: d.businessType,
        services: d.services,
        dealValue: d.dealValue,
        stage: d.stage as any,
        probability: d.probability,
        salesperson: d.salesperson,
        expectedClose: d.expectedClose?.toISOString() || "",
        createdAt: d.createdAt.toISOString(),
        notes: d.notes || "",
      })),
      operationTasks: operationTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        clinic: t.clinicName,
        type: t.type as any,
        status: t.status as any,
        priority: t.priority as any,
        assignee: t.assignee,
        assigneeAvatar: t.assigneeAvatar,
        dueDate: t.dueDate?.toISOString() || "",
        createdAt: t.createdAt.toISOString(),
        tags: t.tags,
      })),
      adsMetrics: adsMetrics.map(m => ({
        id: m.id,
        clinic: m.clinicName,
        campaign: m.campaign,
        spend: m.spend,
        leads: m.leads,
        cpl: m.cpl,
        roas: m.roas,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.ctr,
        status: m.status as any,
      })),
      clients: clientProfiles.map(p => {
        const rawRequirements = (p.requirements as any) || [];
        return {
          id: p.id,
          name: p.clinicName,
          contactPerson: p.contactPerson,
          phone: p.phone,
          contractStart: p.contractStart?.toISOString() || "",
          contractEnd: p.contractEnd?.toISOString() || "",
          monthlyFee: p.monthlyFee,
          adBudget: p.adBudget,
          services: p.services,
          status: p.status as any,
          onboardingComplete: p.onboardingComplete,
          standardRequirements: {
            targetGroup: "",
            kpiGoal: "",
            brandTone: "",
            mainProcedure: ""
          },
          customRequirements: Array.isArray(rawRequirements) ? rawRequirements : [],
          assignedAdminIds: p.assignedAdminIds,
          salesPersonId: "",
          opLeadId: "",
          npsScore: p.npsScore || undefined,
          retentionPlan: p.retentionPlan as any,
          offboardingReason: p.offboardingReason || "",
          onboardingChecklists: p.onboardingChecklists as any,
          offboardingChecklists: p.offboardingChecklists as any,
          adBillingType: "direct",
          adminAllocatedCost: 0,
          productionAllocatedCost: 0,
          salesCommissionPercent: 5,
        };
      }),
      hrAlerts: hrAlerts.map(a => ({
        id: a.id,
        employeeName: a.employeeName,
        type: a.type as any,
        severity: a.severity as any,
        message: a.message,
        date: a.date.toISOString(),
        actionTaken: a.actionTaken,
      })),
      pnlRows: clinics.map(c => {
        const clinicName = c.name.trim().toLowerCase();
        const clientProfile = clientProfiles.find(p => p.clinicName.trim().toLowerCase() === clinicName);
        
        const revenue = Number(clientProfile?.monthlyFee || 0);
        const adSpend = Number(c.adSpend || 0);
        const adminCost = 0;
        const prodCost = 10000;
        const adsOptTotalSalary = Number(fSettings.adsOptTeamTotalSalary);
        const adsOptShare = adsOptTotalSalary / (clinics.length || 1);
        const comms = (revenue * 5) / 100;
        
        const totalCost = adminCost + prodCost + adsOptShare + comms;
        const netProfit = revenue - totalCost;
        const margin = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;
        
        return {
          id: `pnl-${c.id}`,
          clinic: c.name,
          month: "2026-04",
          revenue,
          adSpend,
          adminCost,
          productionCost: prodCost,
          adsOptSharedCost: adsOptShare,
          commission: comms,
          otherDirectCosts: 0,
          netProfit,
          margin,
          adBillingType: "direct",
        };
      }),
      financeSettings: {
        adsOptTeamTotalSalary: Number(fSettings.adsOptTeamTotalSalary),
        totalOfficeOverhead: Number(fSettings.totalOfficeOverhead),
        generalOpsFixedSalary: Number(fSettings.generalOpsFixedSalary),
      },
      attendanceAdjustments: attendanceAdjustments.map(a => ({
        id: a.id,
        adminId: a.staffId,
        name: a.name,
        lateDays: a.lateDays,
        absentDays: a.absentDays,
        leaveDays: a.leaveDays,
        overtimeHours: a.overtimeHours,
        lateDeduction: a.lateDeduction,
        absentDeduction: a.absentDeduction,
        allowance: a.allowance,
        netAdjustment: a.netAdjustment,
      })),
      adBudgetWallets: wallets.map(w => ({
        id: w.id,
        clinic: w.clinicName,
        serviceFeeCollected: w.serviceFeeCollected,
        adWalletBalance: w.adWalletBalance,
        usedAdSpend: w.usedAdSpend,
        remainingAdBudget: w.remainingAdBudget,
        billingDueDate: w.billingDueDate?.toISOString() || "",
        status: w.status as any,
      })),
      cashflowEntries: cashflow.map(e => ({
        id: e.id,
        date: e.date.toISOString(),
        type: e.type as any,
        category: e.category as any,
        label: e.label,
        amount: e.amount,
        reference: e.reference || undefined,
      })),
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category as any,
        priority: t.priority as any,
        status: t.status as any,
        createdBy: t.createdBy,
        assignedTo: t.assignedTo || "",
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        slaHours: t.slaHours,
        slaBreached: t.slaBreached,
      })),
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || "",
        date: e.date.toISOString().split('T')[0],
        time: e.time || undefined,
        source: e.source as any,
        priority: e.priority as any,
        clinic: e.clinicName || undefined,
        assignee: e.assignee || undefined,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        time: n.time || "",
        read: n.read,
        role: n.role as any,
      })),
      backupPolicy: { 
        schedule: "ทุกวัน 03:00 น.",
        retentionDaily: "ย้อนหลัง 30 วัน",
        retentionMonthly: "ย้อนหลัง 12 เดือน",
        retentionYearly: "เก็บถาวรรายปี",
        primaryStorage: "AWS S3 (ap-southeast-1)",
        secondaryStorage: "GCS Coldline (asia-southeast1)",
        nextRunAt: new Date(Date.now() + 86400000).toISOString(),
      },
      backupLogs: backupLogs.map(l => ({
        id: l.id,
        startedAt: l.startedAt.toISOString(),
        finishedAt: l.finishedAt?.toISOString() || "",
        status: l.status as any,
        sizeGb: l.sizeGb,
        recordsCount: l.recordsCount,
        primaryLocation: l.primaryLocation,
        secondaryLocation: l.secondaryLocation,
        errorMessage: l.errorMessage || undefined,
      })),
      monthlyReports: monthlyReports.map(r => ({
        id: r.id,
        monthLabel: r.monthLabel,
        generatedAt: r.generatedAt.toISOString(),
        totalRevenue: r.totalRevenue,
        netProfit: r.netProfit,
        avgCloseRate: r.avgCloseRate,
        avgRoas: r.avgRoas,
        slaRate: r.slaRate,
        recipients: r.recipients,
        status: r.status as any,
        actionItems: r.actionItems,
      })),
      recipientConfigs: recipientConfigs.map(c => ({
        id: c.id,
        role: c.role as any,
        label: c.label,
        scope: c.scope,
        enabled: c.enabled,
        emails: c.emails,
      })),
      aiQuickActions: aiQuickActions.map(q => ({
        id: q.id,
        label: q.label,
        icon: q.icon,
        prompt: q.prompt,
        category: q.category as any,
      })),
      aiResponseLibrary: aiKnowledge.map(k => ({
        id: k.id,
        prompt: k.prompt,
        answer: k.answer,
        category: k.category as any,
        updatedAt: k.updatedAt.toISOString(),
      })),
      invoices: invoices.map(i => ({
        id: i.id,
        clientId: i.clientId,
        clientName: i.clientName,
        invoiceNumber: i.invoiceNumber,
        issueDate: i.issueDate.toISOString(),
        dueDate: i.dueDate.toISOString(),
        amount: i.amount,
        type: i.type as any,
        status: i.status as any,
        paidDate: i.paidDate?.toISOString() || undefined,
        notes: i.notes || undefined,
      })),
      aiKnowledgeBase: { 
        global: { label: "ระบบรวม", items: [] },
        clinics: [] 
      },
    };
  } catch (error) {
    console.error("❌ SQL Fetch Error:", error);
    throw new Error("ระบบไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้ กรุณาตรวจสอบ DATABASE_URL ใน Vercel");
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  console.log("💾 SQL Save: Synchronizing data to production tables...");
  
  const transactions = [];

  // Staff
  for (const admin of data.admins) {
    transactions.push(
      prisma.staff.upsert({
        where: { id: admin.id },
        update: {
          status: admin.status,
          leadsReceived: admin.leadsReceived,
          leadsClosed: admin.leadsClosed,
          closeRate: admin.closeRate,
          avgResponseTime: admin.avgResponseTime,
          revenue: admin.revenue,
          tier: admin.tier,
        },
        create: {
          id: admin.id,
          name: admin.name,
          avatar: admin.avatar,
          role: admin.role,
        }
      })
    );
  }

  // Leads
  for (const lead of data.leads) {
    transactions.push(
      prisma.lead.upsert({
        where: { id: lead.id },
        update: {
          status: lead.status,
          assignedToId: lead.assignedTo,
          notes: lead.notes,
          value: lead.value,
        },
        create: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          channel: lead.channel,
          clinicName: lead.clinic,
          procedure: lead.procedure,
          status: lead.status,
          assignedToId: lead.assignedTo,
          value: lead.value,
          notes: lead.notes,
        }
      })
    );
  }

  // Client Profiles
  for (const profile of data.clients) {
    transactions.push(
      prisma.clientProfile.upsert({
        where: { clinicName: profile.name },
        update: {
          status: profile.status,
          onboardingComplete: profile.onboardingComplete,
          npsScore: profile.npsScore,
          retentionPlan: profile.retentionPlan,
          offboardingReason: profile.offboardingReason,
          requirements: profile.customRequirements as any,
          onboardingChecklists: profile.onboardingChecklists as any,
          offboardingChecklists: profile.offboardingChecklists as any,
        },
        create: {
          id: profile.id,
          clinicName: profile.name,
          contactPerson: profile.contactPerson,
          phone: profile.phone,
          status: profile.status,
          requirements: profile.customRequirements as any,
          onboardingChecklists: profile.onboardingChecklists as any,
          offboardingChecklists: profile.offboardingChecklists as any,
        }
      })
    );
  }

  // Clinics
  for (const clinic of data.clinicClients) {
    transactions.push(
      prisma.clinic.upsert({
        where: { id: clinic.id },
        update: {
          facebookPageId: clinic.facebookPageId,
          facebookAdAccountId: clinic.facebookAdAccountId,
          revenue: clinic.revenue,
          adSpend: clinic.adSpend,
          profit: clinic.profit,
          leadsCount: clinic.leads,
          closeRate: clinic.closeRate,
        },
        create: {
          id: clinic.id,
          name: clinic.name,
          facebookPageId: clinic.facebookPageId,
          facebookAdAccountId: clinic.facebookAdAccountId,
          revenue: clinic.revenue,
          adSpend: clinic.adSpend,
          profit: clinic.profit,
          leadsCount: clinic.leads,
          closeRate: clinic.closeRate,
        }
      })
    );
  }

  // Tickets
  for (const ticket of data.tickets) {
    transactions.push(
      prisma.ticket.upsert({
        where: { id: ticket.id },
        update: {
          status: ticket.status,
          assignedTo: ticket.assignedTo,
          priority: ticket.priority,
          slaBreached: ticket.slaBreached,
        },
        create: {
          id: ticket.id,
          category: ticket.category,
          title: ticket.title,
          description: ticket.description,
          createdBy: ticket.createdBy,
          status: ticket.status,
          priority: ticket.priority,
        }
      })
    );
  }

  // Sales Deals
  for (const deal of data.salesDeals) {
    transactions.push(
      prisma.salesDeal.upsert({
        where: { id: deal.id },
        update: {
          businessName: deal.businessName,
          stage: deal.stage,
          dealValue: deal.dealValue,
          probability: deal.probability,
          notes: deal.notes,
          expectedClose: deal.expectedClose ? new Date(deal.expectedClose) : null,
        },
        create: {
          id: deal.id,
          businessName: deal.businessName,
          contactPerson: deal.contactPerson,
          phone: deal.phone,
          businessType: deal.businessType,
          services: deal.services,
          dealValue: deal.dealValue,
          stage: deal.stage,
          probability: deal.probability,
          salesperson: deal.salesperson,
          expectedClose: deal.expectedClose ? new Date(deal.expectedClose) : null,
        }
      })
    );
  }

  // Tasks
  for (const task of data.operationTasks) {
    transactions.push(
      prisma.operationTask.upsert({
        where: { id: task.id },
        update: {
          status: task.status,
          assignee: task.assignee,
          assigneeAvatar: task.assigneeAvatar,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          tags: task.tags,
          priority: task.priority,
        },
        create: {
          id: task.id,
          title: task.title,
          description: task.description,
          clinicName: task.clinic,
          type: task.type,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          assigneeAvatar: task.assigneeAvatar,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          tags: task.tags,
        }
      })
    );
  }

  // Ads Metrics
  for (const metric of data.adsMetrics) {
    transactions.push(
      prisma.adsMetric.upsert({
        where: { id: metric.id },
        update: {
          spend: metric.spend,
          leads: metric.leads,
          cpl: metric.cpl,
          roas: metric.roas,
          impressions: metric.impressions,
          clicks: metric.clicks,
          ctr: metric.ctr,
          status: metric.status,
        },
        create: {
          id: metric.id,
          clinicName: metric.clinic,
          campaign: metric.campaign,
          spend: metric.spend,
          leads: metric.leads,
          cpl: metric.cpl,
          roas: metric.roas,
          impressions: metric.impressions,
          clicks: metric.clicks,
          ctr: metric.ctr,
          status: metric.status,
        }
      })
    );
  }

  // Attendance
  for (const adj of data.attendanceAdjustments) {
    transactions.push(
      prisma.attendanceAdjustment.upsert({
        where: { id: adj.id },
        update: {
          lateDays: adj.lateDays,
          absentDays: adj.absentDays,
          leaveDays: adj.leaveDays,
          overtimeHours: adj.overtimeHours,
          lateDeduction: adj.lateDeduction,
          absentDeduction: adj.absentDeduction,
          allowance: adj.allowance,
          netAdjustment: adj.netAdjustment,
        },
        create: {
          id: adj.id,
          staffId: adj.adminId,
          name: adj.name,
          lateDays: adj.lateDays,
          absentDays: adj.absentDays,
          leaveDays: adj.leaveDays,
          overtimeHours: adj.overtimeHours,
          lateDeduction: adj.lateDeduction,
          absentDeduction: adj.absentDeduction,
          allowance: adj.allowance,
          netAdjustment: adj.netAdjustment,
        }
      })
    );
  }

  // Invoices
  for (const inv of data.invoices) {
    transactions.push(
      prisma.invoice.upsert({
        where: { invoiceNumber: inv.invoiceNumber },
        update: {
          status: inv.status,
          paidDate: inv.paidDate ? new Date(inv.paidDate) : null,
          notes: inv.notes,
        },
        create: {
          id: inv.id,
          clientId: inv.clientId,
          clientName: inv.clientName,
          invoiceNumber: inv.invoiceNumber,
          issueDate: new Date(inv.issueDate),
          dueDate: new Date(inv.dueDate),
          amount: inv.amount,
          type: inv.type,
          status: inv.status,
          paidDate: inv.paidDate ? new Date(inv.paidDate) : null,
          notes: inv.notes,
        }
      })
    );
  }

  // Finance Settings
  transactions.push(
    prisma.financeSettings.upsert({
      where: { id: "singleton" },
      update: {
        adsOptTeamTotalSalary: data.financeSettings.adsOptTeamTotalSalary,
        totalOfficeOverhead: data.financeSettings.totalOfficeOverhead,
        generalOpsFixedSalary: data.financeSettings.generalOpsFixedSalary,
      },
      create: {
        id: "singleton",
        adsOptTeamTotalSalary: data.financeSettings.adsOptTeamTotalSalary,
        totalOfficeOverhead: data.financeSettings.totalOfficeOverhead,
        generalOpsFixedSalary: data.financeSettings.generalOpsFixedSalary,
      }
    })
  );

  await prisma.$transaction(transactions);
}

export async function patchAppData(
  updater: (current: AppData) => AppData
): Promise<AppData> {
  const current = await getAppData();
  const next = updater(current);
  await saveAppData(next);
  return next;
}
