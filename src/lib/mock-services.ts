// ==============================
// Service Catalog — Marktech Media
// ==============================

export interface ServiceProduct {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  features: { title: string; detail: string }[];
  priceLabel: string;
  category: "marketing" | "content" | "admin";
  activeClients: number;
}

export const serviceProducts: ServiceProduct[] = [
  {
    id: "svc-1",
    name: "Monthly Performance Marketing Service",
    shortName: "Performance Marketing",
    icon: "📊",
    description: "บริการดูแลโฆษณาออนไลน์ครบวงจร",
    features: [
      { title: "วางแผนโฆษณา (Advertising Strategy)", detail: "วิเคราะห์กลุ่มเป้าหมาย พื้นที่ทำเล จุดขาย และแนวทางขึ้นแอดสำหรับบริการของคลินิก" },
      { title: "ขึ้นโฆษณา (Ad Creation & Management)", detail: "จัดการและยิงโฆษณาแบบ ไม่จำกัดจำนวนชุดแอด" },
      { title: "ควบคุมงบ (Budget Management)", detail: "ช่วยควบคุมการใช้จ่ายให้มีประสิทธิภาพสูงสุดภายใต้งบประมาณที่ลูกค้ากำหนด" },
      { title: "ปรับแอดให้เกิดผลสูงสุด (Optimization)", detail: "วิเคราะห์ผลแอดรายสัปดาห์ ปรับกลุ่มเป้าหมาย / คอนเทนต์ / งบ เพื่อให้ได้ CTR, CPL, CPM ที่ดีที่สุด" },
      { title: "รายงานผล & สรุปประสิทธิภาพ", detail: "สรุปผลเป็นรายเดือน พร้อมคำแนะนำการพัฒนาต่อเนื่อง" },
    ],
    priceLabel: "ตามแพ็กเกจ",
    category: "marketing",
    activeClients: 4,
  },
  {
    id: "svc-2",
    name: "Marketing Content",
    shortName: "Content",
    icon: "🎨",
    description: "บริการผลิตคอนเทนต์ดูแลเพจ",
    features: [
      { title: "วิเคราะห์เพจ & วางแผนคอนเทนต์", detail: "ตรวจสอบเนื้อหาเดิมของเพจ และวางธีม/แผนโพสต์ให้เหมาะกับกลุ่มเป้าหมาย" },
      { title: "แนะนำแนวทางคอนเทนต์", detail: "เสนอหัวข้อ พร้อมไกด์ไลน์สำหรับการสื่อสาร" },
      { title: "ออกแบบคอนเทนต์ (12 ชิ้น/เดือน)", detail: "คอนเทนต์ภาพนิ่งพร้อม caption เช่น โปรโมชั่น / ความรู้ / รีวิว ฯลฯ" },
      { title: "อัปโหลดลงเพจ", detail: "จัดคิวโพสต์ตามแผน ให้เหมาะสมในแต่ละวัน" },
      { title: "ปรับปรุงตามผลตอบรับ", detail: "แนะนำการปรับรูปแบบโพสต์ในเดือนถัดไป จาก Report" },
    ],
    priceLabel: "ตามแพ็กเกจ",
    category: "content",
    activeClients: 3,
  },
  {
    id: "svc-3",
    name: "Page Admin",
    shortName: "Page Admin",
    icon: "💬",
    description: "บริการแอดมินตอบแชทให้ลูกค้า",
    features: [
      { title: "ตอบแชทลูกค้า 08:00–20:00 ทุกวัน", detail: "ตอบกลับข้อความลูกค้าใน Inbox, คอมเมนต์ และช่องทางที่เกี่ยวข้อง พร้อมใช้สคริปต์บริการหรือแนวทางที่ตกลงไว้" },
      { title: "สรุปบทสนทนา (Chat Summary Report)", detail: "สรุปบทสนทนาแต่ละวัน แจ้งจำนวนข้อความ ปัญหาหรือคำถามที่พบบ่อย" },
      { title: "รวบรวมข้อมูลคิว/จอง/ความต้องการ", detail: "แยกเก็บข้อมูลลูกค้าที่สนใจ เช่น วันที่จอง / บริการที่สอบถาม / ข้อมูลติดต่อ เพื่อส่งต่อทีมถัดไป" },
      { title: "วิเคราะห์พฤติกรรมลูกค้าเบื้องต้น", detail: "วิเคราะห์คำถามที่พบบ่อย เวลาเข้าแชทบ่อยสุด ประเภทบริการที่สนใจ — นำไปปรับกลยุทธ์แอดและเนื้อหา" },
      { title: "แนะนำการพัฒนา Workflow การตอบแชท", detail: "ช่วยพัฒนา script การตอบ การจัดการแชท และการส่งต่อภายในทีมให้มีประสิทธิภาพยิ่งขึ้น" },
    ],
    priceLabel: "ตามแพ็กเกจ",
    category: "admin",
    activeClients: 5,
  },
];

// ==============================
// Sales Pipeline — Mock Data
// ==============================

export type DealStage = "prospect" | "contacted" | "demo" | "proposal" | "negotiation" | "won" | "lost";

export interface SalesDeal {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  businessType: string;
  services: string[]; // service IDs
  dealValue: number;
  stage: DealStage;
  probability: number;
  salesperson: string;
  createdAt: string;
  expectedClose: string;
  notes: string;
}

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

const dealTemplates: Omit<SalesDeal, "id">[] = [
  {
    businessName: "Prestige Skin Clinic",
    contactPerson: "คุณนุ่น",
    phone: "081-999-1234",
    businessType: "คลินิกความงาม",
    services: ["svc-1", "svc-2", "svc-3"],
    dealValue: 125000,
    stage: "negotiation",
    probability: 70,
    salesperson: "คุณอาร์ม",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() + 7 * 86400000).toISOString(),
    notes: "สนใจแพ็กเกจเต็ม ขอราคาพิเศษ year contract",
  },
  {
    businessName: "Clear Vision Dental",
    contactPerson: "คุณหมออ๋อง",
    phone: "089-888-5555",
    businessType: "คลินิกทันตกรรม",
    services: ["svc-1", "svc-2"],
    dealValue: 65000,
    stage: "proposal",
    probability: 50,
    salesperson: "คุณอาร์ม",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() + 14 * 86400000).toISOString(),
    notes: "ยังลังเลเรื่อง Page Admin",
  },
  {
    businessName: "Zen Spa & Wellness",
    contactPerson: "คุณเจน",
    phone: "092-333-7777",
    businessType: "สปา",
    services: ["svc-2"],
    dealValue: 35000,
    stage: "contacted",
    probability: 30,
    salesperson: "คุณมินท์",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() + 30 * 86400000).toISOString(),
    notes: "เพิ่งติดต่อ รอนัด meeting",
  },
  {
    businessName: "Aura Beauty Clinic สาขาพระราม 9",
    contactPerson: "คุณเอม",
    phone: "086-111-4444",
    businessType: "คลินิกความงาม",
    services: ["svc-1", "svc-2", "svc-3"],
    dealValue: 145000,
    stage: "won",
    probability: 100,
    salesperson: "คุณอาร์ม",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() - 5 * 86400000).toISOString(),
    notes: "ปิดสำเร็จ! เริ่มงานเดือนหน้า",
  },
  {
    businessName: "NaturaCare Clinic",
    contactPerson: "คุณต้อง",
    phone: "095-222-6666",
    businessType: "คลินิกความงาม",
    services: ["svc-1"],
    dealValue: 45000,
    stage: "prospect",
    probability: 10,
    salesperson: "คุณมินท์",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() + 45 * 86400000).toISOString(),
    notes: "Lead จาก referral",
  },
  {
    businessName: "Lumiere Aesthetics",
    contactPerson: "คุณบี",
    phone: "088-555-9999",
    businessType: "คลินิกความงาม",
    services: ["svc-1", "svc-3"],
    dealValue: 85000,
    stage: "demo",
    probability: 40,
    salesperson: "คุณอาร์ม",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    expectedClose: new Date(Date.now() + 20 * 86400000).toISOString(),
    notes: "Demo เสร็จแล้ว รอ feedback",
  },
];

export const mockDeals: SalesDeal[] = dealTemplates.map((d, i) => ({
  ...d,
  id: `deal-${i + 1}`,
}));

export function getSalesPipelineStats() {
  const totalDeals = mockDeals.length;
  const wonDeals = mockDeals.filter((d) => d.stage === "won").length;
  const wonValue = mockDeals.filter((d) => d.stage === "won").reduce((s, d) => s + d.dealValue, 0);
  const pipelineValue = mockDeals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + d.dealValue, 0);
  const weightedPipeline = mockDeals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + d.dealValue * (d.probability / 100), 0);

  return { totalDeals, wonDeals, wonValue, pipelineValue, weightedPipeline: Math.round(weightedPipeline) };
}
