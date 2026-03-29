// ==============================
// Types
// ==============================

export type EventSource = "operation" | "crm" | "client" | "finance" | "hr" | "ticket";
export type EventPriority = "urgent" | "high" | "medium" | "low";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  time?: string; // HH:mm
  source: EventSource;
  priority: EventPriority;
  clinic?: string;
  assignee?: string;
}

// ==============================
// Helpers
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
// Mock Data
// ==============================

// Generate dates relative to "today" (fixed for determinism)
const BASE_DATE = new Date("2026-03-30");
function offsetDate(days: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const mockEvents: CalendarEvent[] = [
  // Operation deadlines
  { id: "ev-1", title: "ส่งแคปชัน BeautyX เดือน เม.ย.", description: "12 ชิ้นงาน Content ประจำเดือน", date: offsetDate(2), time: "12:00", source: "operation", priority: "high", clinic: "BeautyX Clinic", assignee: "ปิติ" },
  { id: "ev-2", title: "ตัดต่อ Reels SkinLab", description: "Reels ก่อน-หลัง 3 คลิป", date: offsetDate(3), time: "17:00", source: "operation", priority: "medium", clinic: "SkinLab Thailand", assignee: "กานต์" },
  { id: "ev-3", title: "Approve กราฟิก Glow Up", description: "Banner Facebook 5 ชิ้น", date: offsetDate(1), time: "10:00", source: "operation", priority: "high", clinic: "Glow Up Clinic", assignee: "เจน" },

  // CRM events
  { id: "ev-4", title: "ประชุม Review ยอด Admin", description: "ประชุมสรุปยอดรายสัปดาห์", date: offsetDate(1), time: "14:00", source: "crm", priority: "high", assignee: "AM" },
  { id: "ev-5", title: "Training สคริปต์ปิดการขาย", description: "อบรมทีม Admin เรื่อง Handle Objection", date: offsetDate(5), time: "10:00", source: "crm", priority: "medium" },

  // Client events
  { id: "ev-6", title: "ต่อสัญญา Dermis Premium", description: "สัญญาหมด 31 ก.ค. — ต้องตัดสินใจ", date: offsetDate(0), source: "client", priority: "urgent", clinic: "Dermis Premium" },
  { id: "ev-7", title: "Onboarding FaceCraft เฟส 2", description: "เก็บ Requirement เพิ่มเติม", date: offsetDate(4), time: "13:00", source: "client", priority: "high", clinic: "FaceCraft Clinic", assignee: "คุณแนน" },
  { id: "ev-8", title: "Meeting Review SkinLab", description: "ประชุม Monthly Report กับลูกค้า", date: offsetDate(7), time: "15:00", source: "client", priority: "medium", clinic: "SkinLab Thailand" },

  // Finance events
  { id: "ev-9", title: "วันจ่ายเงินเดือน", description: "จ่ายเงินเดือน + Commission ทั้งทีม", date: offsetDate(1), source: "finance", priority: "urgent" },
  { id: "ev-10", title: "วางบิล BeautyX", description: "วางบิลค่าบริการ + ค่าแอดเดือน มี.ค.", date: offsetDate(2), source: "finance", priority: "high", clinic: "BeautyX Clinic" },
  { id: "ev-11", title: "สรุปงบแอด Q1", description: "สรุปค่าใช้จ่ายโฆษณาไตรมาส 1", date: offsetDate(3), source: "finance", priority: "medium" },

  // HR events
  { id: "ev-12", title: "PIP Review สมหญิง", description: "ประเมินผล PIP รอบที่ 2", date: offsetDate(2), time: "11:00", source: "hr", priority: "urgent", assignee: "สมหญิง" },
  { id: "ev-13", title: "สัมภาษณ์ Admin ใหม่", description: "สัมภาษณ์ผู้สมัคร 3 คน", date: offsetDate(4), time: "09:00", source: "hr", priority: "high" },
  { id: "ev-14", title: "ต่อสัญญา ปาริชาด", description: "สัญญาหมดอายุใน 30 วัน", date: offsetDate(6), source: "hr", priority: "medium", assignee: "ปาริชาด" },

  // Ticket SLA deadlines
  { id: "ev-15", title: "SLA: Internet ห้อง Meeting", description: "Ticket IT ด่วน — SLA 2 ชม.", date: offsetDate(0), time: "09:00", source: "ticket", priority: "urgent" },
  { id: "ev-16", title: "SLA: ขออนุมัติงบโฆษณา", description: "Ticket Finance — SLA 24 ชม.", date: offsetDate(1), source: "ticket", priority: "medium" },
];

// ==============================
// Stats
// ==============================

export function getTimelineStats() {
  const today = offsetDate(0);
  const todayEvents = mockEvents.filter((e) => e.date === today).length;
  const urgentEvents = mockEvents.filter((e) => e.priority === "urgent").length;
  const thisWeek = mockEvents.filter((e) => {
    const d = new Date(e.date);
    const start = new Date(BASE_DATE);
    const end = new Date(BASE_DATE);
    end.setDate(end.getDate() + 7);
    return d >= start && d < end;
  }).length;

  return { todayEvents, urgentEvents, thisWeek, totalEvents: mockEvents.length };
}
