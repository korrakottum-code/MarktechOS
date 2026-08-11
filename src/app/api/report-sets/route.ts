import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/require-admin";
import { requireTeamMember } from "@/lib/server/require-team";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── GET /api/report-sets — saved page groupings + 7-day mini overview ───────
// Read access: any team member (not client). Used by the home-page picker.
export async function GET() {
  const user = await requireTeamMember();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sets = await prisma.pageReportSet.findMany({ orderBy: { name: "asc" } });
  if (sets.length === 0) return NextResponse.json({ sets: [] });

  const until = toISO(new Date());
  const since = toISO(new Date(Date.now() - 6 * 86400000));
  const allPageIds = [...new Set(sets.flatMap(s => s.pageIds))];

  const [nameRows, metricRows] = await Promise.all([
    prisma.pageNameCache.findMany({ where: { pageId: { in: allPageIds } } }),
    prisma.adsMetricDaily.findMany({
      where: { pageId: { in: allPageIds }, date: { gte: since, lte: until } },
      select: { pageId: true, spend: true, inbox: true, leads: true, impressions: true },
    }),
  ]);
  const nameMap = new Map(nameRows.map(r => [r.pageId, r.pageName]));

  const sets_ = sets.map(set => {
    const idSet = new Set(set.pageIds);
    const overview = metricRows
      .filter(r => idSet.has(r.pageId))
      .reduce(
        (acc, r) => ({
          spend: acc.spend + r.spend,
          inbox: acc.inbox + r.inbox,
          leads: acc.leads + r.leads,
          impressions: acc.impressions + r.impressions,
        }),
        { spend: 0, inbox: 0, leads: 0, impressions: 0 },
      );
    return {
      id: set.id,
      name: set.name,
      pageIds: set.pageIds,
      pageNames: set.pageIds.map(id => nameMap.get(id) || id),
      overview: { ...overview, since, until },
    };
  });

  return NextResponse.json({ sets: sets_ });
}

// ── POST /api/report-sets — create a saved page set (admin/ceo only) ────────
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String) : [];
    if (!name) return NextResponse.json({ error: "กรุณาตั้งชื่อชุด" }, { status: 400 });
    if (pageIds.length === 0) return NextResponse.json({ error: "กรุณาเลือกอย่างน้อย 1 เพจ" }, { status: 400 });

    const set = await prisma.pageReportSet.create({ data: { name, pageIds } });
    return NextResponse.json({ set });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PUT /api/report-sets — rename / change pages in a saved set (admin/ceo) ─
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });

    const name = String(body.name || "").trim();
    const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String) : [];
    if (!name) return NextResponse.json({ error: "กรุณาตั้งชื่อชุด" }, { status: 400 });
    if (pageIds.length === 0) return NextResponse.json({ error: "กรุณาเลือกอย่างน้อย 1 เพจ" }, { status: 400 });

    const set = await prisma.pageReportSet.update({ where: { id }, data: { name, pageIds } });
    return NextResponse.json({ set });
  } catch (err) {
    // Someone else deleted this set (or it never existed) between load and save.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบชุดนี้แล้ว — อาจถูกลบไปแล้ว" }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE /api/report-sets?id=... — remove a saved set (admin/ceo only) ────
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });

  try {
    await prisma.pageReportSet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
