import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthenticationError, getPageAccessForCurrentUser } from "@/lib/server/allowed-pages";

export async function GET() {
  try {
    // Check user's allowed pages (page-level access control)
    const { allowedPages } = await getPageAccessForCurrentUser();

    // Only return pages that actually occur in the ads dataset. This avoids
    // stale cache entries becoming selectable in the dashboard.
    const observedPages = await prisma.adsMetricDaily.findMany({
      distinct: ["pageId"],
      select: { pageId: true },
      where: { pageId: { not: "" } },
    });
    const where: any = { pageId: { in: observedPages.map(({ pageId }) => pageId) } };
    if (allowedPages) {
      where.pageId = { in: allowedPages.filter(pageId => observedPages.some(page => page.pageId === pageId)) };
    }

    const pages = await prisma.pageNameCache.findMany({
      where,
      orderBy: { pageName: "asc" }
    });
    return NextResponse.json({ pages });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
