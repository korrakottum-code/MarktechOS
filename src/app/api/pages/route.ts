import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthenticationError, getPageAccessForCurrentUser } from "@/lib/server/allowed-pages";

export async function GET() {
  try {
    // Check user's allowed pages (page-level access control)
    const { allowedPages } = await getPageAccessForCurrentUser();

    // Only return pages that actually occur in the ads dataset. This avoids
    // stale cache entries becoming selectable in the dashboard. Pulled across
    // all history (not scoped to any date range) so a page with data only
    // outside the currently-viewed range still resolves to its account(s) —
    // e.g. for a manual Sync trigger on a page with no rows in the current view.
    const observedRows = await prisma.adsMetricDaily.findMany({
      distinct: ["pageId", "adAccountId"],
      select: { pageId: true, adAccountId: true },
      where: { pageId: { not: "" } },
    });
    const accountsByPage = new Map<string, Set<string>>();
    for (const { pageId, adAccountId } of observedRows) {
      if (!adAccountId) continue;
      if (!accountsByPage.has(pageId)) accountsByPage.set(pageId, new Set());
      accountsByPage.get(pageId)!.add(adAccountId);
    }
    const observedPageIds = [...accountsByPage.keys()];
    const where: any = { pageId: { in: observedPageIds } };
    if (allowedPages) {
      where.pageId = { in: allowedPages.filter(pageId => accountsByPage.has(pageId)) };
    }

    const cached = await prisma.pageNameCache.findMany({
      where,
      orderBy: { pageName: "asc" }
    });
    // Fall back to pageId for names scraped off Facebook login/error pages so
    // the page stays selectable instead of showing e.g. "Log into Facebook".
    const INVALID_PAGE_NAMES = new Set([
      "facebook", "log in to facebook", "log into facebook",
      "เข้าสู่ระบบ facebook", "เกิดข้อผิดพลาด", "page not found",
      "content not found", "ลงชื่อเข้าใช้ facebook",
    ]);
    const pages = cached.map(p => ({
      ...(INVALID_PAGE_NAMES.has(p.pageName.toLowerCase()) ? { ...p, pageName: p.pageId } : p),
      adAccountIds: [...(accountsByPage.get(p.pageId) ?? [])],
    }));
    return NextResponse.json({ pages });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
