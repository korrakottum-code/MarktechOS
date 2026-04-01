import type { 
  SalesDeal, 
  ServiceProduct, 
  OperationTask, 
  TaskPriority, 
  TaskStatus, 
  ContentType, 
  ClientProfile,
  ClientRequirement
} from "./app-data-types";
import { 
  serviceProducts, 
  defaultOnboardingChecklist, 
  defaultOffboardingChecklist 
} from "./app-utils";

/**
 * Generates automated onboarding tasks when a Sales Deal is "Won".
 */
export function createOnboardingTasks(deal: SalesDeal): Omit<OperationTask, "id">[] {
  const tasks: Omit<OperationTask, "id">[] = [];
  const selectedServices = deal.services.map(sid => 
    serviceProducts.find(s => s.id === sid)
  ).filter(Boolean) as ServiceProduct[];

  // 1. Common Onboarding Task
  tasks.push({
    title: `Kickoff Meeting — ${deal.businessName}`,
    description: `ประชุมเปิดโปรเจกต์และสรุปขอบเขตงานหลังจากปิดดีลสำเร็จ (Sales: ${deal.salesperson})`,
    clinic: deal.businessName,
    type: "ad-copy",
    status: "backlog",
    priority: "high",
    assignee: "เจน", // Default Project Manager
    assigneeAvatar: "จ",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    tags: ["onboarding", "strategy"],
  });

  // 2. Service-Specific Tasks
  selectedServices.forEach(svc => {
    if (svc.category === "marketing") {
      tasks.push({
        title: `Ad Account Audit — ${deal.businessName}`,
        description: `ตรวจสอบบัญชีโฆษณาและตั้งค่าการเข้าถึง (Access management)`,
        clinic: deal.businessName,
        type: "ad-copy",
        status: "todo",
        priority: "medium",
        assignee: "ปิติ",
        assigneeAvatar: "ป",
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        tags: ["ads", "setup"],
      });
    }

    if (svc.category === "content") {
      tasks.push({
        title: `Content Moodboard & Strategy — ${deal.businessName}`,
        description: `จัดทำตัวอย่างคอนเทนต์และ Moodboard ให้เลือก (Style guide)`,
        clinic: deal.businessName,
        type: "graphic",
        status: "todo",
        priority: "high",
        assignee: "กานต์",
        assigneeAvatar: "ก",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        tags: ["content", "creative"],
      });
    }

    if (svc.category === "admin") {
      tasks.push({
        title: `Admin Script Setup — ${deal.businessName}`,
        description: `จัดเตรียมสคริปต์การตอบแชทและข้อมูลบริการประจำคลินิก`,
        clinic: deal.businessName,
        type: "caption",
        status: "todo",
        priority: "urgent",
        assignee: "จารุวรรณ", // Assuming she's a lead admin
        assigneeAvatar: "จ",
        dueDate: new Date(Date.now() + 4 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        tags: ["admin", "scripts"],
      });
    }
  });

  return tasks;
}

/**
 * Maps a Sales Deal to a new Client Profile for Module 3.
 */
export function createClientFromDeal(deal: SalesDeal): Omit<ClientProfile, "id"> {
  const selectedServices = deal.services.map(sid => 
    serviceProducts.find(s => s.id === sid)?.shortName
  ).filter(Boolean) as string[];

  return {
    name: deal.businessName,
    contactPerson: deal.contactPerson,
    phone: deal.phone,
    contractStart: new Date().toISOString().split("T")[0],
    contractEnd: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    monthlyFee: deal.dealValue / 12,
    adBudget: 0,
    services: [deal.services[0]], // Ensure it's inside an array of service IDs
    status: "active",
    onboardingComplete: false,
    standardRequirements: {
      targetGroup: "",
      kpiGoal: "",
      brandTone: "",
      mainProcedure: ""
    },
    customRequirements: [
      { id: "r-1", category: "จาก Sales", question: "หมายเหตุจากการขาย", answer: deal.notes || "", filledAt: new Date().toISOString() },
    ],
    assignedAdminIds: [],
    salesPersonId: deal.salesperson,
    opLeadId: "",
    adBillingType: "direct",
    adminAllocatedCost: 0,
    productionAllocatedCost: 10000,
    salesCommissionPercent: 5,
    onboardingChecklists: [...defaultOnboardingChecklist],
    offboardingChecklists: [...defaultOffboardingChecklist],
  };
}
