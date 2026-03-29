// ==============================
// Types
// ==============================

export interface Admin {
  id: string;
  name: string;
  avatar: string;
  role: "admin";
  leadsReceived: number;
  leadsClosed: number;
  closeRate: number;
  avgResponseTime: number; // minutes
  revenue: number;
  tier: "none" | "bronze" | "silver" | "gold";
  status: "online" | "busy" | "offline";
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  channel: "facebook" | "instagram" | "line" | "website";
  clinic: string;
  procedure: string;
  status: "new" | "contacted" | "negotiating" | "closed" | "lost";
  assignedTo: string; // admin id
  createdAt: string;
  value: number;
  notes: string;
}

export interface ClinicClient {
  id: string;
  name: string;
  revenue: number;
  adSpend: number;
  profit: number;
  leads: number;
  closeRate: number;
}

// ==============================
// Tier Logic
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
// Mock Data
// ==============================

const adminNames = [
  "สมหญิง", "วิภา", "กนกวรรณ", "ปาริชาด", "นภาพร", "ศิริพร",
  "จารุวรรณ", "พิมพ์ชนก", "อรอุมา", "ธนิดา", "ชลิตา", "ภัทรา",
];

export const mockAdmins: Admin[] = adminNames.map((name, i) => {
  const leadsReceived = Math.floor(Math.random() * 40) + 20;
  const closeRate = Math.floor(Math.random() * 40) + 15;
  const leadsClosed = Math.round((leadsReceived * closeRate) / 100);
  return {
    id: `admin-${i + 1}`,
    name,
    avatar: name[0],
    role: "admin",
    leadsReceived,
    leadsClosed,
    closeRate,
    avgResponseTime: Math.floor(Math.random() * 20) + 3,
    revenue: leadsClosed * (Math.floor(Math.random() * 5000) + 3000),
    tier: getTier(closeRate),
    status: i < 8 ? "online" : i < 10 ? "busy" : "offline",
  };
});

const channels: Lead["channel"][] = ["facebook", "instagram", "line", "website"];
const statuses: Lead["status"][] = ["new", "contacted", "negotiating", "closed", "lost"];
const clinics = [
  "BeautyX Clinic",
  "Glow Up Clinic",
  "SkinLab Thailand",
  "Dermis Premium",
  "FaceCraft Clinic",
];
const procedures = [
  "Botox",
  "Filler",
  "Laser CO2",
  "ร้อยไหม",
  "โบท็อกซ์หน้าเรียว",
  "ฉีดผิว",
  "PRP",
  "Mesotherapy",
];

const customerNames = [
  "คุณแอน", "คุณเบล", "คุณมิ้นท์", "คุณใบเฟิร์น", "คุณโบว์",
  "คุณนุ่น", "คุณเจน", "คุณมุก", "คุณออม", "คุณเก้า",
  "คุณส้ม", "คุณปลา", "คุณน้ำ", "คุณเอิร์ธ", "คุณฟ้า",
  "คุณไอซ์", "คุณเดียร์", "คุณพลอย", "คุณแนน", "คุณจ๋า",
  "คุณบี", "คุณนิว", "คุณกิ่ง", "คุณเมย์", "คุณปอ",
  "คุณทราย", "คุณวิว", "คุณเจี๊ยบ", "คุณหญิง", "คุณฝ้าย",
];

export const mockLeads: Lead[] = Array.from({ length: 30 }, (_, i) => ({
  id: `lead-${i + 1}`,
  name: customerNames[i % customerNames.length],
  phone: `09${Math.floor(Math.random() * 90000000 + 10000000)}`,
  channel: channels[Math.floor(Math.random() * channels.length)],
  clinic: clinics[Math.floor(Math.random() * clinics.length)],
  procedure: procedures[Math.floor(Math.random() * procedures.length)],
  status: statuses[Math.floor(Math.random() * statuses.length)],
  assignedTo: `admin-${Math.floor(Math.random() * 12) + 1}`,
  createdAt: new Date(
    Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
  ).toISOString(),
  value: Math.floor(Math.random() * 20000) + 5000,
  notes: "",
}));

export const mockClients: ClinicClient[] = clinics.map((name, i) => {
  const revenue = Math.floor(Math.random() * 500000) + 200000;
  const adSpend = Math.floor(Math.random() * 100000) + 50000;
  return {
    id: `clinic-${i + 1}`,
    name,
    revenue,
    adSpend,
    profit: revenue - adSpend,
    leads: Math.floor(Math.random() * 200) + 80,
    closeRate: Math.floor(Math.random() * 30) + 25,
  };
});

// ==============================
// Summary Stats
// ==============================

export function getDashboardStats() {
  const totalLeads = mockLeads.length;
  const closedLeads = mockLeads.filter((l) => l.status === "closed").length;
  const newLeads = mockLeads.filter((l) => l.status === "new").length;
  const totalRevenue = mockAdmins.reduce((sum, a) => sum + a.revenue, 0);
  const avgCloseRate =
    mockAdmins.reduce((sum, a) => sum + a.closeRate, 0) / mockAdmins.length;
  const onlineAdmins = mockAdmins.filter((a) => a.status === "online").length;
  const belowThreshold = mockAdmins.filter((a) => a.closeRate < 30).length;

  return {
    totalLeads,
    closedLeads,
    newLeads,
    totalRevenue,
    avgCloseRate: Math.round(avgCloseRate),
    onlineAdmins,
    totalAdmins: mockAdmins.length,
    belowThreshold,
  };
}

// ==============================
// Helpers
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
