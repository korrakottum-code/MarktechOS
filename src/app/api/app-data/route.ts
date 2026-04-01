import { NextRequest, NextResponse } from "next/server";

import { getAppData, patchAppData, saveAppData } from "@/lib/server/app-data-store";
import {
  getDashboardStatsFromData,
  getFinanceStatsFromData,
  getOperationStatsFromData,
  getPlatformOpsStatsFromData,
  getSalesPipelineStatsFromData,
  getTicketStatsFromData,
  getTimelineStatsFromData,
} from "@/lib/app-data-computed";
import { requireSession } from "@/lib/server/auth-guard";
import { AppData, ClientProfile } from "@/lib/app-data-types";

function buildResponsePayload(data: Awaited<ReturnType<typeof getAppData>>) {
  return {
    data,
    stats: {
      dashboard: getDashboardStatsFromData(data.admins, data.leads),
      sales: getSalesPipelineStatsFromData(data.salesDeals),
      operation: getOperationStatsFromData(data.operationTasks, data.adsMetrics),
      finance: getFinanceStatsFromData(
        data.admins,
        data.attendanceAdjustments,
        data.adBudgetWallets,
        data.cashflowEntries,
        data.financeSettings,
        data.clients
      ),
      tickets: getTicketStatsFromData(data.tickets),
      timeline: getTimelineStatsFromData(data.events),
      platform: getPlatformOpsStatsFromData(data),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const data = await getAppData();
    return NextResponse.json(buildResponsePayload(data));
  } catch (error: any) {
    console.error("🏁 API Execution Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch application data" }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireSession(request, ["ceo", "admin", "finance"]);
  if (!session.ok) return session.response;

  const body = (await request.json()) as Awaited<ReturnType<typeof getAppData>>;
  await saveAppData(body);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession(request, ["ceo", "admin", "finance", "am"]);
  if (!session.ok) return session.response;

  const body = (await request.json()) as {
    section?: keyof AppData;
    value?: unknown;
    patches?: Partial<AppData>;
  };

  if (!body?.section && !body?.patches) {
    return NextResponse.json({ error: "section or patches is required" }, { status: 400 });
  }

  const updated = await patchAppData((current) => {
    let next = { ...current };

    // Handle multi-patch
    if (body.patches) {
      next = { ...next, ...body.patches };
    }

    // Handle single section patch
    if (body.section) {
      const section = body.section;
      const value = body.value;

      // Special automation for salesDeals if not already handled by multi-patch
      if (section === "salesDeals" && !body.patches) {
        const currentDeals = current.salesDeals;
        const updatedDeals = value as typeof currentDeals;
        
        // Identify newly 'won' deals
        const newlyWonDeals = updatedDeals.filter(deal => {
          const oldDeal = currentDeals.find(d => d.id === deal.id);
          return deal.stage === "won" && (!oldDeal || oldDeal.stage !== "won");
        });

        if (newlyWonDeals.length > 0) {
          // Note: Full automation logic is already being handled by frontend multiPatch
          // but we keep this as a backend safeguard for direct API calls.
          const newClinics = [...next.clinicClients];
          const newProfiles = [...next.clients];
          const newTasks = [...next.operationTasks];

          newlyWonDeals.forEach(deal => {
            const exists = newClinics.some(c => c.name === deal.businessName);
            if (!exists) {
              const newClient: ClientProfile = {
                id: `client-won-${Date.now()}`,
                name: deal.businessName,
                contactPerson: deal.contactPerson,
                phone: deal.phone,
                contractStart: deal.expectedClose,
                contractEnd: new Date(new Date(deal.expectedClose).getTime() + 365 * 86400000).toISOString(),
                monthlyFee: deal.dealValue,
                adBudget: 0,
                services: deal.services,
                status: "active",
                assignedAdminIds: [],
                salesPersonId: deal.salesperson,
                opLeadId: "",
                onboardingComplete: false,
                npsScore: undefined,
                retentionPlan: "none",
                offboardingReason: "",
                adBillingType: "direct",
                adminAllocatedCost: 0,
                productionAllocatedCost: 10000,
                salesCommissionPercent: 5,
                standardRequirements: {
                  targetGroup: "",
                  kpiGoal: "",
                  brandTone: "",
                  mainProcedure: ""
                },
                customRequirements: [],
                onboardingChecklists: [],
                offboardingChecklists: [],
              };
              newProfiles.push(newClient);
            }
          });
          next.clinicClients = newClinics;
          next.clients = newProfiles;
          next.operationTasks = newTasks;
        }
      }

      next[section] = value as any;
    }

    return next;
  });

  return NextResponse.json(buildResponsePayload(updated));
}
