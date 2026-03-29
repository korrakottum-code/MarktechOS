import { createSeededRandom } from "./mock-data";

const rand = createSeededRandom(300);

// ==============================
// Types
// ==============================

export type TicketCategory = "hr" | "it" | "ops" | "finance" | "general";
export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaHours: number;
  slaBreached: boolean;
}

// ==============================
// Helpers
// ==============================

export function getCategoryLabel(cat: TicketCategory): string {
  switch (cat) {
    case "hr": return "👤 HR";
    case "it": return "💻 IT";
    case "ops": return "⚙️ Ops";
    case "finance": return "💰 การเงิน";
    case "general": return "📋 ทั่วไป";
  }
}

export function getCategoryColor(cat: TicketCategory): string {
  switch (cat) {
    case "hr": return "bg-purple-500/20 text-purple-400";
    case "it": return "bg-blue-500/20 text-blue-400";
    case "ops": return "bg-amber-500/20 text-amber-400";
    case "finance": return "bg-emerald-500/20 text-emerald-400";
    case "general": return "bg-gray-500/20 text-gray-400";
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
// Mock Data
// ==============================

const ticketTemplates = [
  { title: "ขอลาพักร้อน 3 วัน", category: "hr" as TicketCategory, priority: "low" as TicketPriority, sla: 24 },
  { title: "คอมพิวเตอร์ค้าง เปิดไม่ติด", category: "it" as TicketCategory, priority: "high" as TicketPriority, sla: 4 },
  { title: "ขออนุมัติงบโฆษณาเพิ่ม", category: "finance" as TicketCategory, priority: "medium" as TicketPriority, sla: 24 },
  { title: "ขอเปลี่ยน Password อีเมลบริษัท", category: "it" as TicketCategory, priority: "medium" as TicketPriority, sla: 8 },
  { title: "แจ้งซ่อมแอร์ออฟฟิศชั้น 2", category: "ops" as TicketCategory, priority: "low" as TicketPriority, sla: 48 },
  { title: "ขอใบรับรองเงินเดือน", category: "hr" as TicketCategory, priority: "medium" as TicketPriority, sla: 24 },
  { title: "ขอเบิกค่าเดินทางประจำเดือน", category: "finance" as TicketCategory, priority: "low" as TicketPriority, sla: 48 },
  { title: "Internet ห้อง Meeting ใช้ไม่ได้", category: "it" as TicketCategory, priority: "urgent" as TicketPriority, sla: 2 },
  { title: "ขอลาป่วย 1 วัน", category: "hr" as TicketCategory, priority: "low" as TicketPriority, sla: 24 },
  { title: "ขอ Access เข้าระบบ CRM", category: "it" as TicketCategory, priority: "high" as TicketPriority, sla: 4 },
  { title: "แจ้งปัญหา Printer ชั้น 3", category: "ops" as TicketCategory, priority: "medium" as TicketPriority, sla: 24 },
  { title: "ขอเอกสาร 50 ทวิ", category: "finance" as TicketCategory, priority: "medium" as TicketPriority, sla: 48 },
];

const creators = ["สมหญิง", "วิภา", "กนกวรรณ", "ปิติ", "มานิต", "กานต์"];
const assignees = ["HR หัวหน้า", "IT Admin", "บัญชี", "Ops Manager", "ฝ่ายบุคคล"];
const statuses: TicketStatus[] = ["open", "open", "in-progress", "in-progress", "resolved", "closed"];

export const mockTickets: Ticket[] = ticketTemplates.map((tpl, i) => {
  const hoursAgo = Math.floor(rand() * 72) + 1;
  const createdAt = new Date(Date.now() - hoursAgo * 3600000);
  const slaBreached = hoursAgo > tpl.sla && statuses[i % statuses.length] !== "resolved" && statuses[i % statuses.length] !== "closed";

  return {
    id: `TK-${String(i + 1).padStart(3, "0")}`,
    title: tpl.title,
    description: `รายละเอียด: ${tpl.title}`,
    category: tpl.category,
    priority: tpl.priority,
    status: statuses[i % statuses.length],
    createdBy: creators[i % creators.length],
    assignedTo: assignees[i % assignees.length],
    createdAt: createdAt.toISOString(),
    updatedAt: new Date(createdAt.getTime() + rand() * 24 * 3600000).toISOString(),
    slaHours: tpl.sla,
    slaBreached,
  };
});

// ==============================
// Stats
// ==============================

export function getTicketStats() {
  const total = mockTickets.length;
  const open = mockTickets.filter((t) => t.status === "open").length;
  const inProgress = mockTickets.filter((t) => t.status === "in-progress").length;
  const resolved = mockTickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const slaBreached = mockTickets.filter((t) => t.slaBreached).length;
  const slaRate = Math.round(((total - slaBreached) / total) * 100);

  return { total, open, inProgress, resolved, slaBreached, slaRate };
}
