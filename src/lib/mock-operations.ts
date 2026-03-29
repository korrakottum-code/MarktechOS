// ==============================
// Types
// ==============================

export type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type ContentType = "caption" | "graphic" | "video" | "ad-copy" | "photo";

export interface OperationTask {
  id: string;
  title: string;
  description: string;
  clinic: string;
  type: ContentType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assigneeAvatar: string;
  dueDate: string;
  createdAt: string;
  tags: string[];
}

export interface AdsMetric {
  id: string;
  clinic: string;
  campaign: string;
  spend: number;
  leads: number;
  cpl: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  status: "active" | "paused" | "ended";
}

// ==============================
// Helpers
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

export const statusColumns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "backlog", label: "📥 Backlog", color: "border-gray-500/30" },
  { key: "todo", label: "📋 To-do", color: "border-blue-500/30" },
  { key: "in-progress", label: "⚡ กำลังทำ", color: "border-amber-500/30" },
  { key: "review", label: "👀 ตรวจงาน", color: "border-purple-500/30" },
  { key: "done", label: "✅ เสร็จ", color: "border-emerald-500/30" },
];

// ==============================
// Mock Data — Tasks
// ==============================

const clinics = [
  "BeautyX Clinic",
  "Glow Up Clinic",
  "SkinLab Thailand",
  "Dermis Premium",
  "FaceCraft Clinic",
];

const teamMembers = [
  { name: "ปิติ", avatar: "ป" },
  { name: "มานิต", avatar: "ม" },
  { name: "กานต์", avatar: "ก" },
  { name: "เจน", avatar: "จ" },
  { name: "ฟ้า", avatar: "ฟ" },
  { name: "บอม", avatar: "บ" },
];

const taskTemplates = [
  { title: "แคปชันโปรโมชั่นเดือนนี้", type: "caption" as ContentType, tags: ["content", "promo"] },
  { title: "ดีไซน์ Banner Facebook", type: "graphic" as ContentType, tags: ["design", "ads"] },
  { title: "ตัดต่อ Reels ก่อน-หลัง", type: "video" as ContentType, tags: ["video", "reels"] },
  { title: "เขียน Ad Copy แคมเปญใหม่", type: "ad-copy" as ContentType, tags: ["ads", "copywriting"] },
  { title: "ถ่ายภาพ Content รีวิว", type: "photo" as ContentType, tags: ["photo", "review"] },
  { title: "Infographic ข้อมูลหัตถการ", type: "graphic" as ContentType, tags: ["design", "info"] },
  { title: "คลิปอธิบายโปรโมชั่น", type: "video" as ContentType, tags: ["video", "promo"] },
  { title: "แคปชัน Testimonial ลูกค้า", type: "caption" as ContentType, tags: ["content", "testimonial"] },
  { title: "ภาพ Carousel สินค้า", type: "graphic" as ContentType, tags: ["design", "carousel"] },
  { title: "Ad Copy A/B Test", type: "ad-copy" as ContentType, tags: ["ads", "test"] },
  { title: "แคปชัน FAQ ตอบคำถาม", type: "caption" as ContentType, tags: ["content", "faq"] },
  { title: "วิดีโอ BTS คลินิก", type: "video" as ContentType, tags: ["video", "bts"] },
  { title: "Story Template ประจำสัปดาห์", type: "graphic" as ContentType, tags: ["design", "story"] },
  { title: "ถ่ายภาพผลิตภัณฑ์ใหม่", type: "photo" as ContentType, tags: ["photo", "product"] },
  { title: "แคปชัน Case Study", type: "caption" as ContentType, tags: ["content", "case-study"] },
];

const priorities: TaskPriority[] = ["urgent", "high", "medium", "medium", "low"];
const statuses: TaskStatus[] = ["backlog", "todo", "todo", "in-progress", "in-progress", "review", "done", "done"];

export const mockTasks: OperationTask[] = taskTemplates.map((tpl, i) => {
  const member = teamMembers[i % teamMembers.length];
  const clinic = clinics[i % clinics.length];
  const daysOffset = Math.floor(Math.random() * 14) - 3;
  return {
    id: `task-${i + 1}`,
    title: `${tpl.title} — ${clinic}`,
    description: `ชิ้นงาน ${tpl.type} สำหรับ ${clinic}`,
    clinic,
    type: tpl.type,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    assignee: member.name,
    assigneeAvatar: member.avatar,
    dueDate: new Date(Date.now() + daysOffset * 86400000).toISOString(),
    createdAt: new Date(Date.now() - (7 + i) * 86400000).toISOString(),
    tags: tpl.tags,
  };
});

// ==============================
// Mock Data — Ads Metrics
// ==============================

const campaigns = [
  "โปรเปิดคลินิก",
  "Botox Month",
  "Filler Festival",
  "Summer Glow",
  "Laser Week",
];

export const mockAdsMetrics: AdsMetric[] = clinics.flatMap((clinic, ci) =>
  campaigns.slice(0, 2 + (ci % 2)).map((campaign, j) => {
    const spend = Math.floor(Math.random() * 30000) + 5000;
    const leads = Math.floor(Math.random() * 50) + 10;
    const impressions = Math.floor(Math.random() * 100000) + 20000;
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.01));
    return {
      id: `ads-${ci}-${j}`,
      clinic,
      campaign,
      spend,
      leads,
      cpl: Math.round(spend / leads),
      roas: +(Math.random() * 4 + 1).toFixed(2),
      impressions,
      clicks,
      ctr: +(clicks / impressions * 100).toFixed(2),
      status: (j === 0 ? "active" : Math.random() > 0.5 ? "active" : "paused") as AdsMetric["status"],
    };
  })
);

// ==============================
// Stats
// ==============================

export function getOperationStats() {
  const total = mockTasks.length;
  const done = mockTasks.filter((t) => t.status === "done").length;
  const inProgress = mockTasks.filter((t) => t.status === "in-progress").length;
  const overdue = mockTasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date()
  ).length;
  const totalAdSpend = mockAdsMetrics.reduce((s, a) => s + a.spend, 0);
  const avgCPL =
    mockAdsMetrics.reduce((s, a) => s + a.cpl, 0) / mockAdsMetrics.length;
  const avgROAS =
    mockAdsMetrics.reduce((s, a) => s + a.roas, 0) / mockAdsMetrics.length;

  return { total, done, inProgress, overdue, totalAdSpend, avgCPL: Math.round(avgCPL), avgROAS: +avgROAS.toFixed(2) };
}
