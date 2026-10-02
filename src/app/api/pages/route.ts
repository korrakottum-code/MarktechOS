import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthenticationError, getPageAccessForCurrentUser } from "@/lib/server/allowed-pages";

// Sidebar เรียก endpoint นี้ทุกหน้า ข้อมูลส่วนกลาง (หน้า → บัญชีโฆษณา, ชื่อเพจ) เปลี่ยนไม่บ่อย
// จึงแคชในหน่วยความจำของ instance นี้ไว้สั้นๆ แทนการ query ตาราง AdsMetricDaily ทั้งก้อนทุกครั้ง
// (การเช็คสิทธิ์ต่อผู้ใช้ยังทำทุก request ตามเดิม แคชเฉพาะข้อมูลที่ทุกคนเห็นเหมือนกัน)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface PageCatalog {
  accountsByPage: Map<string, string[]>;
  names: { pageId: string; pageName: string }[];
}

let catalogCache: { value: PageCatalog; at: number } | null = null;
let inflight: Promise<PageCatalog> | null = null;

async function loadCatalog(): Promise<PageCatalog> {
  // Only pages that actually occur in the ads dataset, across all history (not scoped
  // to a date range) so a page with data only outside the viewed range still resolves
  // to its account(s). groupBy ทำ GROUP BY ใน SQL — findMany({ distinct }) ของ Prisma
  // ดึงทุกแถวมากรองซ้ำใน memory ซึ่งช้ามากบนตารางใหญ่
  const [observed, names] = await Promise.all([
    prisma.adsMetricDaily.groupBy({
      by: ["pageId", "adAccountId"],
      where: { pageId: { not: "" } },
    }),
    prisma.pageNameCache.findMany({ orderBy: { pageName: "asc" } }),
  ]);

  const sets = new Map<string, Set<string>>();
  for (const { pageId, adAccountId } of observed) {
    if (!adAccountId) continue;
    if (!sets.has(pageId)) sets.set(pageId, new Set());
    sets.get(pageId)!.add(adAccountId);
  }
  const accountsByPage = new Map<string, string[]>();
  for (const [pageId, accounts] of sets) accountsByPage.set(pageId, [...accounts]);

  return { accountsByPage, names: names.map(n => ({ pageId: n.pageId, pageName: n.pageName })) };
}

async function getCatalog(): Promise<PageCatalog> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL_MS) return catalogCache.value;
  // request ที่เข้ามาพร้อมกันรอผลโหลดเดียวกัน ไม่ยิง query ซ้ำซ้อนตอน DB ช้า
  if (!inflight) {
    inflight = loadCatalog()
      .then(value => {
        catalogCache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    // โหลดใหม่ไม่ได้ (เช่น DB timeout) แต่มีของเก่าอยู่ ใช้ของเก่าดีกว่าให้ทั้งเว็บพัง
    if (catalogCache) return catalogCache.value;
    throw err;
  }
}

export async function GET() {
  try {
    // Check user's allowed pages (page-level access control)
    const { allowedPages } = await getPageAccessForCurrentUser();

    const { accountsByPage, names } = await getCatalog();
    const allowed = allowedPages ? new Set(allowedPages) : null;

    // Fall back to pageId for names scraped off Facebook login/error pages so
    // the page stays selectable instead of showing e.g. "Log into Facebook".
    const INVALID_PAGE_NAMES = new Set([
      "facebook", "log in to facebook", "log into facebook",
      "เข้าสู่ระบบ facebook", "เกิดข้อผิดพลาด", "page not found",
      "content not found", "ลงชื่อเข้าใช้ facebook",
    ]);
    const pages = names
      .filter(p => accountsByPage.has(p.pageId) && (!allowed || allowed.has(p.pageId)))
      .map(p => ({
        ...p,
        pageName: INVALID_PAGE_NAMES.has(p.pageName.toLowerCase()) ? p.pageId : p.pageName,
        adAccountIds: accountsByPage.get(p.pageId) ?? [],
      }));
    return NextResponse.json({ pages });
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
