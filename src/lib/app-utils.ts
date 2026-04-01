import type { 
  Admin, 
  Lead, 
  DealStage, 
  TaskStatus,
  TaskPriority, 
  ContentType, 
  HRAlert, 
  ClientProfile, 
  TicketPriority, 
  TicketStatus, 
  TicketCategory, 
  EventSource, 
  BackupStatus, 
  InvoiceStatus, 
  InvoiceType, 
  OverdueLevel,
  WalletStatus,
  CashflowCategory,
  ServiceProduct
} from "./app-data-types";

// ==============================
// Admin & Tier Helpers (from mock-data.ts)
// ==============================

export function getTier(closeRate: number): Admin["tier"] {
  if (closeRate >= 50) return "gold";
  if (closeRate >= 40) return "silver";
  if (closeRate >= 30) return "bronze";
  return "none";
}

export function getCommission(closeRate: number): number {
  if (closeRate >= 50) return 1500;
  if (closeRate >= 40) return 500;
  return 0;
}

export function getTierColor(tier: Admin["tier"]): string {
  switch (tier) {
    case "gold":
      return "text-yellow-400";
    case "silver":
      return "text-gray-300";
    case "bronze":
      return "text-orange-400";
    default:
      return "text-red-400";
  }
}

export function getTierBg(tier: Admin["tier"]): string {
  switch (tier) {
    case "gold":
      return "bg-yellow-400/10 border-yellow-400/30";
    case "silver":
      return "bg-gray-300/10 border-gray-300/30";
    case "bronze":
      return "bg-orange-400/10 border-orange-400/30";
    default:
      return "bg-red-400/10 border-red-400/30";
  }
}

export function getTierLabel(tier: Admin["tier"]): string {
  switch (tier) {
    case "gold":
      return "🥇 Gold";
    case "silver":
      return "🥈 Silver";
    case "bronze":
      return "🥉 Bronze";
    default:
      return "⚠️ ต่ำกว่าเกณฑ์";
  }
}

export function getMotivationalMessage(closeRate: number): string {
  if (closeRate >= 50) return "🎉 ยอดเยี่ยม! คุณอยู่ระดับ Gold แล้ว!";
  if (closeRate >= 45)
    return "🔥 เกือบถึง Gold แล้ว! อีกแค่ " + (50 - closeRate) + "% เท่านั้น!";
  if (closeRate >= 40) return "💪 ดีมาก! Silver แล้ว ลุยอีก 5% รับโบนัส 1,500 บาท!";
  if (closeRate >= 35)
    return "📈 ใกล้ Silver แล้ว! อีก " + (40 - closeRate) + "% ได้โบนัส 500 บาท!";
  if (closeRate >= 30)
    return "✅ ผ่านเกณฑ์แล้ว! ลุยอีก " + (40 - closeRate) + "% รับโบนัส!";
  if (closeRate >= 25) return "⚠️ ขาดอีก " + (30 - closeRate) + "% เพื่อผ่านเกณฑ์";
  return "🚨 ผลงานต่ำกว่าเกณฑ์ — กรุณาปรับปรุง";
}

// ==============================
// Formatting Helpers (from mock-data.ts)
// ==============================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("th-TH").format(value);
}

export function getChannelIcon(channel: Lead["channel"]): string {
  switch (channel) {
    case "facebook":
      return "📘";
    case "instagram":
      return "📸";
    case "line":
      return "💚";
    case "website":
      return "🌐";
    default:
      return "📦";
  }
}

export function getStatusLabel(status: Lead["status"]): string {
  switch (status) {
    case "new":
      return "ใหม่";
    case "contacted":
      return "ติดต่อแล้ว";
    case "negotiating":
      return "เจรจา";
    case "closed":
      return "ปิดการขาย";
    case "lost":
      return "สูญเสีย";
    default:
      return status;
  }
}

export function getStatusColor(status: Lead["status"]): string {
  switch (status) {
    case "new":
      return "bg-blue-500/20 text-blue-400";
    case "contacted":
      return "bg-amber-500/20 text-amber-400";
    case "negotiating":
      return "bg-purple-500/20 text-purple-400";
    case "closed":
      return "bg-emerald-500/20 text-emerald-400";
    case "lost":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

// ==============================
// Sales & Service Helpers
// ==============================

export const serviceProducts: ServiceProduct[] = [
  {
    id: "svc-mkt-001",
    name: "Full Marketing Agency (ดูแลเพจครบวงจร)",
    shortName: "Full Marketing",
    icon: "🚀",
    category: "marketing",
    description: "ดูแลการตลาดออนไลน์ครบวงจร ตั้งแต่วางกลยุทธ์ ยิงโฆษณา จนถึงปิดการขาย",
    priceLabel: "เริ่มต้น 35,000.- / เดือน",
    activeClients: 12,
    features: [
      { title: "ยิงโฆษณา Facebook/IG/TikTok", detail: "วางแผนงบประมาณและกลุ่มเป้าหมายแม่นยำ" },
      { title: "ทีมแอดมินตอบแชท 24 ชม.", detail: "ปิดการขายไว เพิ่มยอด Conversion" },
      { title: "รายงานผลรายเดือน", detail: "วิเคราะห์ข้อมูลเชิงลึกเพื่อปรับปรุงกลยุทธ์" },
    ],
  },
  {
    id: "svc-cont-002",
    name: "Content Production (ผลิตคอนเทนต์คุณภาพ)",
    shortName: "Content Only",
    icon: "🎨",
    category: "content",
    description: "เน้นการสร้างภาพลักษณ์แบรนด์ผ่านคอนเทนต์ที่น่าสนใจและมีคุณภาพสูง",
    priceLabel: "เริ่มต้น 15,000.- / เดือน",
    activeClients: 8,
    features: [
      { title: "กราฟิกดีไซน์ระดับพรีเมียม", detail: "ออกแบบภาพแบนเนอร์และอินโฟกราฟิก" },
      { title: "ตัดต่อวิดีโอสั้น/Reels", detail: "สร้างคลิปที่กระตุ้นการตัดสินใจ" },
      { title: "วางแผนคอนเทนต์รายเดือน", detail: "สร้างกระแสและรักษาฐานแฟนเพจ" },
    ],
  },
  {
    id: "svc-adm-003",
    name: "Specialized Admin (ทีมตอบแชทมืออาชีพ)",
    shortName: "Admin Service",
    icon: "💬",
    category: "admin",
    description: "ทีมแอดมินที่มีทักษะการปิดการขายสูง สำหรับธุรกิจที่มียอดแชทจำนวนมาก",
    priceLabel: "เริ่มต้น 10,000.- / เดือน",
    activeClients: 15,
    features: [
      { title: "ปิดการขาย (Closing Sales)", detail: "เน้นเปลี่ยน Lead ให้เป็นยอดขาย" },
      { title: "บันทึกข้อมูลลูกค้า (CRM)", detail: "จัดการระบบติดตามลูกค้าอย่างเป็นระบบ" },
      { title: "ประเมินความพึงพอใจลูกค้า", detail: "NPS และการดูแลหลังการขาย" },
    ],
  },
];

export function getDealStageLabel(stage: DealStage): string {
  switch (stage) {
    case "prospect": return "🔍 Prospect";
    case "contacted": return "📞 Contacted";
    case "demo": return "🎤 Demo";
    case "proposal": return "📄 Proposal";
    case "negotiation": return "🤝 Negotiation";
    case "won": return "✅ Won";
    case "lost": return "❌ Lost";
  }
}

export function getDealStageColor(stage: DealStage): string {
  switch (stage) {
    case "prospect": return "bg-gray-500/20 text-gray-400";
    case "contacted": return "bg-blue-500/20 text-blue-400";
    case "demo": return "bg-purple-500/20 text-purple-400";
    case "proposal": return "bg-amber-500/20 text-amber-400";
    case "negotiation": return "bg-orange-500/20 text-orange-400";
    case "won": return "bg-emerald-500/20 text-emerald-400";
    case "lost": return "bg-red-500/20 text-red-400";
  }
}

// ==============================
// Operation Helpers (from mock-operations.ts)
// ==============================

export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "low":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case "urgent":
      return "🔴 ด่วนมาก";
    case "high":
      return "🟠 สำคัญ";
    case "medium":
      return "🔵 ปกติ";
    case "low":
      return "⚪ ต่ำ";
  }
}

export function getContentTypeIcon(type: ContentType): string {
  switch (type) {
    case "caption":
      return "📝";
    case "graphic":
      return "🎨";
    case "video":
      return "🎬";
    case "ad-copy":
      return "✍️";
    case "photo":
      return "📸";
  }
}

export function getContentTypeLabel(type: ContentType): string {
  switch (type) {
    case "caption":
      return "แคปชัน";
    case "graphic":
      return "กราฟิก";
    case "video":
      return "วิดีโอ";
    case "ad-copy":
      return "Ad Copy";
    case "photo":
      return "ถ่ายภาพ";
  }
}

// ==============================
// HR & Client Helpers (from mock-clients.ts)
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
    case "offboarding":
      return "bg-slate-500/20 text-slate-400";
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
    case "offboarding":
      return "⏹️ Offboarding";
  }
}

export function getNpsColor(score?: number): string {
  if (score === undefined) return "text-slate-500";
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export function getNpsLabel(score?: number): string {
  if (score === undefined) return "—";
  if (score >= 8) return `😊 ${score}/10`;
  if (score >= 5) return `😐 ${score}/10`;
  return `😟 ${score}/10`;
}

export function getRetentionPlanLabel(plan?: string): string {
  switch (plan) {
    case "none": return "";
    case "monitor": return "🔍 Monitor";
    case "retention": return "⚠️ Retention Plan";
    case "critical": return "🚨 Critical Retention";
    default: return "";
  }
}

export function getRetentionPlanColor(plan?: string): string {
  switch (plan) {
    case "none": return "";
    case "monitor": return "bg-blue-500/20 text-blue-400";
    case "retention": return "bg-amber-500/20 text-amber-400";
    case "critical": return "bg-red-500/20 text-red-400";
    default: return "";
  }
}

// ==============================
// Ticket Helpers (from mock-tickets.ts)
// ==============================

export function getCategoryLabel(cat: TicketCategory): string {
  switch (cat) {
    case "hr": return "👤 HR";
    case "it": return "💻 IT";
    case "ops": return "⚙️ Ops";
    case "finance": return "💰 การเงิน";
    case "general": return "📋 ทั่วไป";
    case "crisis": return "🚨 W/F V2 Crisis";
    default: return cat;
  }
}

export function getCategoryColor(cat: TicketCategory): string {
  switch (cat) {
    case "hr": return "bg-purple-500/20 text-purple-400";
    case "it": return "bg-blue-500/20 text-blue-400";
    case "ops": return "bg-amber-500/20 text-amber-400";
    case "finance": return "bg-emerald-500/20 text-emerald-400";
    case "general": return "bg-gray-500/20 text-gray-400";
    case "crisis": return "bg-red-500/20 text-red-500 font-bold border border-red-500/30";
    default: return "bg-gray-500/20 text-gray-400";
  }
}

export function getTicketPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case "urgent": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-blue-400";
    case "low": return "text-gray-400";
  }
}

export function getTicketPriorityLabel(priority: TicketPriority): string {
  switch (priority) {
    case "urgent": return "🔴 ด่วนมาก";
    case "high": return "🟠 ด่วน";
    case "medium": return "🔵 ปกติ";
    case "low": return "⚪ ต่ำ";
  }
}

export function getTicketStatusColor(status: TicketStatus): string {
  switch (status) {
    case "open": return "bg-blue-500/20 text-blue-400";
    case "in-progress": return "bg-amber-500/20 text-amber-400";
    case "resolved": return "bg-emerald-500/20 text-emerald-400";
    case "closed": return "bg-gray-500/20 text-gray-400";
  }
}

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case "open": return "เปิด";
    case "in-progress": return "กำลังดำเนินการ";
    case "resolved": return "แก้ไขแล้ว";
    case "closed": return "ปิด";
  }
}

// ==============================
// Event Helpers (from mock-events.ts)
// ==============================

export function getSourceLabel(source: EventSource): string {
  switch (source) {
    case "operation": return "Operation";
    case "crm": return "CRM";
    case "client": return "Client";
    case "finance": return "การเงิน";
    case "hr": return "HR";
    case "ticket": return "Ticket";
  }
}

export function getSourceColor(source: EventSource): string {
  switch (source) {
    case "operation": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "crm": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "client": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "finance": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "hr": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "ticket": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function getSourceIcon(source: EventSource): string {
  switch (source) {
    case "operation": return "⚙️";
    case "crm": return "📊";
    case "client": return "🏥";
    case "finance": return "💰";
    case "hr": return "👤";
    case "ticket": return "🎫";
  }
}

// ==============================
// Platform & Finance Helpers
// ==============================

export function getBackupStatusColor(status: BackupStatus): string {
  switch (status) {
    case "success":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "warning":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "failed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

export function getBackupStatusLabel(status: BackupStatus): string {
  switch (status) {
    case "success":
      return "สำเร็จ";
    case "warning":
      return "เตือน";
    case "failed":
      return "ล้มเหลว";
  }
}

export function getInvoiceStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    case "sent":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "paid":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "overdue":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "📝 ฉบับร่าง";
    case "sent":
      return "📤 ส่งแล้ว";
    case "paid":
      return "✅ ชำระแล้ว";
    case "overdue":
      return "🚨 เกินกำหนด";
  }
}

export function getInvoiceTypeLabel(type: InvoiceType): string {
  switch (type) {
    case "service-fee":
      return "ค่าบริการรายเดือน";
    case "ad-budget":
      return "งบโฆษณา";
    case "deposit":
      return "ค่ามัดจำ";
  }
}

export function getOverdueLevelLabel(level?: OverdueLevel): string {
  switch (level) {
    case "day1":
      return "Day 1: แจ้ง AM";
    case "day7":
      return "Day 7: แจ้งลูกค้า";
    case "day14":
      return "Day 14: CEO โทรตาม";
    case "day30":
      return "Day 30: พิจารณาหยุดงาน";
    default:
      return "";
  }
}

export function getWalletStatusColor(status: WalletStatus): string {
  switch (status) {
    case "healthy":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "watch":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

export function getWalletStatusLabel(status: WalletStatus): string {
  switch (status) {
    case "healthy":
      return "✅ ปกติ";
    case "watch":
      return "⚠️ เฝ้าระวัง";
    case "critical":
      return "🚨 วิกฤต";
  }
}

export function getCashflowCategoryLabel(category: CashflowCategory): string {
  switch (category) {
    case "service-fee":
      return "ค่าบริการ";
    case "ad-topup":
      return "เติมกระเป๋าแอด";
    case "ad-spend":
      return "ใช้จ่ายแอด";
    case "payroll":
      return "เงินเดือน";
    case "commission":
      return "คอมมิชชัน";
    case "operations":
      return "ค่าใช้จ่ายดำเนินงาน";
    default:
      return category;
  }
}

export const statusColumns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "backlog", label: "📦 Backlog", color: "border-gray-500/50" },
  { key: "todo", label: "🎯 To Do", color: "border-blue-500/50" },
  { key: "in-progress", label: "⚡ In Progress", color: "border-amber-500/50" },
  { key: "review", label: "🔍 Review", color: "border-purple-500/50" },
  { key: "done", label: "✅ Completed", color: "border-emerald-500/50" },
];

export const defaultOnboardingChecklist = [
  { id: "ob-1", text: "ป่าวประกาศทีมงาน (Announce Team)", completed: false },
  { id: "ob-2", text: "ดึงเข้ากรุ๊ป Line / Facebook", completed: false },
  { id: "ob-3", text: "รับ Requirement เบื้องต้น", completed: false },
  { id: "ob-4", text: "ตั้งค่าระบบ Billing & Invoice", completed: false },
  { id: "ob-5", text: "มอบหมายแอดมินและทีมผลิต", completed: false },
];

export const defaultOffboardingChecklist = [
  { id: "off-1", text: "สรุป Report ปิดโปรเจกต์", completed: false },
  { id: "off-2", text: "คืนสิทธิ์การเข้าถึง (Access Control)", completed: false },
  { id: "off-3", text: "เคลียร์ยอดค้างชำระทั้งหมด", completed: false },
  { id: "off-4", text: "ขอบคุณลูกค้าและขอลีดรีวิว", completed: false },
];
