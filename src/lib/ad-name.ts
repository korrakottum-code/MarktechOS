// Works out which service and price an ad is selling, and whether its campaign
// is a sales campaign at all. Teams name ads "<service><price>" (botox990) but
// not always (brand names, file names), so the service is looked up in order:
//   1. manual mapping (AdServiceMap, set on the comparison page)
//   2. the ad name   3. the campaign name   4. the ad copy from Meta
// and anything still unknown goes to one "unknown service" group instead of
// becoming a service of its own.

export const COMBO = "คอมโบ";
export const BUNDLE = "รวมโปร";
export const UNKNOWN = "ไม่ระบุบริการ";
export const NO_AD = "ไม่มีแอด";

/** Canonical service → words that mean it (lowercase; Thai and English). */
const SERVICES: [string, RegExp][] = [
  ["botox", /botox|โบท็อก|โบท๊อก|โบทอก|โบท็อค|nabota|นาโบต้า|xeomin|dysport|ลดกราม|กรามเล็ก/],
  ["filler", /filler|ฟิลเลอร์|ฟีลเลอร์|เติมปาก|ปากอิ่ม|เติมคาง|เติมใต้ตา/],
  ["hifu", /hifu|ไฮฟู|ulthera|อัลเทอร่า|อัลเธอร่า|ultraformer|อัลตร้าฟอร์เมอร์/],
  ["ร้อยไหม", /ร้อยไหม|thread\s*lift|ไหมก้างปลา/],
  ["pico", /pico|พิโค|ลบรอยสัก|tattoo/],
  ["vitamin", /vitamin|วิตามิน|ผิวใส|ฉีดผิว|กลูต้า|gluta/],
  ["เลเซอร์กำจัดขน", /diode|กำจัดขน|เลเซอร์ขน|hair\s*removal|(^|[^ก-๙])ขน(\d|\s|$|รักแร้|ขา|หน้า)/],
  ["acne", /acne|สิว|หลุมสิว/],
  ["ipl", /\bipl\b/],
  ["q switch", /q\s*-?switch|คิวสวิตช์/],
  ["สลายไขมัน", /meso|เมโส|\bfat\d*|แฟต|สลายไขมัน|ลดเหนียง|ลดแก้ม|ฟิตแอนด์เฟิร์ม/],
  ["skin booster", /vitaran|ไวตาแรน|rejuran|รีจูรัน|profhilo|โปรไฟโล|sculptra|สกัลป์ตร้า/],
  ["oligio", /oligio|ออลิจิโอ/],
  ["thermage", /thermage|เทอร์มาจ/],
  ["ฝ้า กระ", /ฝ้า|melasma/],
  ["hpv", /hpv|วัคซีน/],
];

const BUNDLE_RE = /^(all|set)(\b|$)|โปรรวม|รวมโปร|^\d{1,2}\.\d{1,2}$|(^|\s)\d{1,2}\.\d{1,2}(\s|$)/;

export function nameKey(adName: string): string {
  return (adName || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function servicesIn(text: string): string[] {
  const t = text.toLowerCase();
  return SERVICES.filter(([, re]) => re.test(t)).map(([s]) => s);
}

/** A price written in the text: 990.- / 990 บาท / ฿990, or a trailing number (botox990). */
export function priceIn(text: string, allowTrailing = false): number | null {
  const t = (text || "").toLowerCase();
  const m = t.match(/(?:฿\s*)(\d{1,3}(?:,\d{3})+|\d{3,6})|(\d{1,3}(?:,\d{3})+|\d{3,6})\s*(?:\.-|บาท|฿|thb)/);
  if (m) return Number((m[1] ?? m[2]).replace(/,/g, ""));
  if (allowTrailing) {
    // Number glued to a service word (botox990, ขน990) or at the end of the name.
    const tail = t.match(/[a-zก-๙](\d{3,6})(?!\d)/) ?? t.match(/[a-zก-๙\s+](\d{3,6})\s*$/);
    if (tail) return Number(tail[1]);
  }
  return null;
}

export interface ServiceMapping { service: string; price: number | null; exclude: boolean }
export type ServiceSource = "manual" | "name" | "campaign" | "creative" | "unknown";
export interface ResolvedService { service: string; price: number | null; source: ServiceSource; exclude: boolean }

export function resolveService(input: {
  adName: string;
  campaignName?: string;
  creativeText?: string;
  mapping?: ServiceMapping;
}): ResolvedService {
  const name = nameKey(input.adName);
  const m = input.mapping;
  const namePrice = priceIn(name, true);
  if (m && (m.service || m.exclude)) {
    return { service: m.service || UNKNOWN, price: m.price ?? namePrice, source: "manual", exclude: m.exclude };
  }
  if (name.includes("+") && servicesIn(name).length >= 1) return { service: COMBO, price: namePrice, source: "name", exclude: false };
  if (BUNDLE_RE.test(name)) return { service: BUNDLE, price: namePrice, source: "name", exclude: false };
  const inName = servicesIn(name);
  if (inName.length > 1) return { service: COMBO, price: namePrice, source: "name", exclude: false };
  if (inName.length === 1) return { service: inName[0], price: namePrice, source: "name", exclude: false };

  const inCampaign = servicesIn(input.campaignName ?? "");
  if (inCampaign.length === 1) return { service: inCampaign[0], price: namePrice ?? priceIn(input.campaignName ?? ""), source: "campaign", exclude: false };
  if (BUNDLE_RE.test(nameKey(input.campaignName ?? "")) || /รวมโปร|โปรรวม/.test(input.campaignName ?? "")) {
    return { service: BUNDLE, price: namePrice, source: "campaign", exclude: false };
  }

  const text = input.creativeText ?? "";
  if (text) {
    const inText = servicesIn(text);
    if (inText.length === 1) return { service: inText[0], price: namePrice ?? priceIn(text), source: "creative", exclude: false };
    if (inText.length > 1) return { service: BUNDLE, price: namePrice, source: "creative", exclude: false };
  }
  return { service: UNKNOWN, price: namePrice, source: "unknown", exclude: false };
}

/** Price-point key used by the "by price" table: service + price, or the ad name if no price. */
export function pricePointKey(r: ResolvedService, adName: string): string {
  if (r.price !== null && r.service !== UNKNOWN) return `${r.service} ${r.price.toLocaleString("en-US")}`;
  return r.service === UNKNOWN ? nameKey(adName) || UNKNOWN : `${r.service} (ไม่ระบุราคา)`;
}

export type CampaignKind = "message" | "lead" | "awareness" | "hr";

const HR_RE = /สมัครงาน|รับสมัคร|หาพนักงาน|รับพนักงาน|\bhr\b|recruit/;
const AWARENESS_RE = /awareness|\breach\b|engagement|branding|การรับรู้|\baw\b|\bview/;

/**
 * Campaign type from its name and results. "aw" in a name is not enough —
 * some "AW" campaigns are message campaigns that bring chats — so awareness
 * also needs almost no chats (< 1 chat per ฿1,000).
 */
export function campaignKind(campaignName: string, spend: number, chats: number): CampaignKind {
  const n = nameKey(campaignName);
  if (HR_RE.test(n)) return "hr";
  if (AWARENESS_RE.test(n) && spend > 0 && (chats / spend) * 1000 < 1) return "awareness";
  if (/\blead\b|ลีด/.test(n)) return "lead";
  return "message";
}
