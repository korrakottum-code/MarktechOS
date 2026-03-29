import { createSeededRandom } from "./mock-data";

const rand = createSeededRandom(100);

// ==============================
// Types
// ==============================

export interface ClientProfile {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  contractStart: string;
  contractEnd: string;
  monthlyFee: number;
  adBudget: number;
  services: string[];
  status: "active" | "warning" | "churning";
  onboardingComplete: boolean;
  requirements: ClientRequirement[];
}

export interface ClientRequirement {
  id: string;
  category: string;
  question: string;
  answer: string;
  filledAt: string;
}

export interface HRAlert {
  id: string;
  employeeName: string;
  type: "pip" | "late" | "absent" | "low-performance" | "contract-end";
  severity: "critical" | "warning" | "info";
  message: string;
  date: string;
  actionTaken: boolean;
}

export interface MonthlyPnL {
  clinic: string;
  revenue: number;
  adSpend: number;
  operationCost: number;
  commission: number;
  netProfit: number;
  margin: number;
}

// ==============================
// Mock Data — Clients
// ==============================

const servicesList = [
  "Facebook Ads",
  "Instagram Ads",
  "Content Creation",
  "Admin ตอบแชท",
  "Graphic Design",
  "Video Production",
  "LINE OA Management",
  "SEO",
];

export const mockClients: ClientProfile[] = [
  {
    id: "client-1",
    name: "BeautyX Clinic",
    contactPerson: "คุณพลอย",
    phone: "081-234-5678",
    contractStart: "2025-01-01",
    contractEnd: "2025-12-31",
    monthlyFee: 45000,
    adBudget: 80000,
    services: ["Facebook Ads", "Content Creation", "Admin ตอบแชท", "Graphic Design"],
    status: "active",
    onboardingComplete: true,
    requirements: [
      { id: "r1", category: "แบรนด์", question: "Tone of voice ที่ต้องการ", answer: "สุภาพ เป็นกันเอง ใช้ภาษาง่ายๆ", filledAt: "2025-01-05" },
      { id: "r2", category: "เป้าหมาย", question: "เป้าหมาย Lead ต่อเดือน", answer: "100 Lead / เดือน", filledAt: "2025-01-05" },
      { id: "r3", category: "หัตถการ", question: "บริการหลักที่ต้องการโปรโมท", answer: "Botox, Filler, Laser", filledAt: "2025-01-05" },
    ],
  },
  {
    id: "client-2",
    name: "Glow Up Clinic",
    contactPerson: "คุณแนน",
    phone: "089-876-5432",
    contractStart: "2025-03-01",
    contractEnd: "2026-02-28",
    monthlyFee: 35000,
    adBudget: 60000,
    services: ["Facebook Ads", "Instagram Ads", "Content Creation"],
    status: "active",
    onboardingComplete: true,
    requirements: [
      { id: "r4", category: "แบรนด์", question: "Tone of voice ที่ต้องการ", answer: "หรูหรา พรีเมียม", filledAt: "2025-03-05" },
      { id: "r5", category: "เป้าหมาย", question: "เป้าหมาย Lead ต่อเดือน", answer: "80 Lead / เดือน", filledAt: "2025-03-05" },
    ],
  },
  {
    id: "client-3",
    name: "SkinLab Thailand",
    contactPerson: "คุณโบว์",
    phone: "092-111-2233",
    contractStart: "2025-06-01",
    contractEnd: "2026-05-31",
    monthlyFee: 55000,
    adBudget: 120000,
    services: ["Facebook Ads", "Instagram Ads", "Content Creation", "Admin ตอบแชท", "Video Production", "LINE OA Management"],
    status: "active",
    onboardingComplete: true,
    requirements: [
      { id: "r6", category: "แบรนด์", question: "Tone of voice ที่ต้องการ", answer: "เป็นผู้เชี่ยวชาญ ให้ข้อมูลเชิงลึก", filledAt: "2025-06-03" },
    ],
  },
  {
    id: "client-4",
    name: "Dermis Premium",
    contactPerson: "คุณเบล",
    phone: "086-444-5566",
    contractStart: "2025-02-01",
    contractEnd: "2025-07-31",
    monthlyFee: 30000,
    adBudget: 40000,
    services: ["Facebook Ads", "Graphic Design"],
    status: "warning",
    onboardingComplete: true,
    requirements: [],
  },
  {
    id: "client-5",
    name: "FaceCraft Clinic",
    contactPerson: "คุณมิ้นท์",
    phone: "095-777-8899",
    contractStart: "2025-08-01",
    contractEnd: "2026-07-31",
    monthlyFee: 40000,
    adBudget: 70000,
    services: ["Facebook Ads", "Content Creation", "Admin ตอบแชท", "Graphic Design"],
    status: "active",
    onboardingComplete: false,
    requirements: [
      { id: "r7", category: "แบรนด์", question: "Tone of voice ที่ต้องการ", answer: "", filledAt: "" },
    ],
  },
];

// ==============================
// Mock Data — HR Alerts
// ==============================

export const mockHRAlerts: HRAlert[] = [
  {
    id: "hr-1",
    employeeName: "สมหญิง",
    type: "low-performance",
    severity: "critical",
    message: "Close Rate ต่ำกว่า 30% ติดต่อกัน 2 เดือน — เข้า PIP",
    date: "2025-03-28",
    actionTaken: false,
  },
  {
    id: "hr-2",
    employeeName: "ธนิดา",
    type: "late",
    severity: "warning",
    message: "มาสายสะสม 5 ครั้ง ในเดือนนี้",
    date: "2025-03-27",
    actionTaken: false,
  },
  {
    id: "hr-3",
    employeeName: "อรอุมา",
    type: "absent",
    severity: "warning",
    message: "ลาป่วยสะสม 3 วัน ติดต่อกัน ไม่มีใบรับรองแพทย์",
    date: "2025-03-26",
    actionTaken: true,
  },
  {
    id: "hr-4",
    employeeName: "ปาริชาด",
    type: "contract-end",
    severity: "info",
    message: "สัญญาจ้างหมดอายุในอีก 30 วัน — ต้องตัดสินใจต่อสัญญา",
    date: "2025-04-28",
    actionTaken: false,
  },
  {
    id: "hr-5",
    employeeName: "บอม (Content)",
    type: "pip",
    severity: "critical",
    message: "ส่งงานไม่ตรง Deadline 4 ครั้ง / เดือน — เข้า PIP",
    date: "2025-03-25",
    actionTaken: false,
  },
];

// ==============================
// Mock Data — P&L
// ==============================

export const mockPnL: MonthlyPnL[] = mockClients.map((client) => {
  const revenue = client.monthlyFee + client.adBudget * 0.15;
  const operationCost = Math.floor(rand() * 15000) + 8000;
  const commission = Math.floor(rand() * 5000) + 2000;
  const netProfit = revenue - client.adBudget - operationCost - commission;
  return {
    clinic: client.name,
    revenue,
    adSpend: client.adBudget,
    operationCost,
    commission,
    netProfit,
    margin: +((netProfit / revenue) * 100).toFixed(1),
  };
});

// ==============================
// Helpers
// ==============================

export function getAlertSeverityColor(severity: HRAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 border-red-500/30 text-red-400";
    case "warning":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case "info":
      return "bg-blue-500/10 border-blue-500/30 text-blue-400";
  }
}

export function getAlertTypeIcon(type: HRAlert["type"]): string {
  switch (type) {
    case "pip":
      return "🚨";
    case "late":
      return "⏰";
    case "absent":
      return "🏥";
    case "low-performance":
      return "📉";
    case "contract-end":
      return "📋";
  }
}

export function getClientStatusColor(status: ClientProfile["status"]): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/20 text-emerald-400";
    case "warning":
      return "bg-amber-500/20 text-amber-400";
    case "churning":
      return "bg-red-500/20 text-red-400";
  }
}

export function getClientStatusLabel(status: ClientProfile["status"]): string {
  switch (status) {
    case "active":
      return "✅ Active";
    case "warning":
      return "⚠️ Warning";
    case "churning":
      return "🔴 Churning";
  }
}
