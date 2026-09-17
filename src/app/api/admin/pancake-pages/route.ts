import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/require-admin";
import { fetchActivatedPages } from "@/lib/pancake";

// ── GET /api/admin/pancake-pages — เพจที่ติดตามอยู่ + รายชื่อเพจทั้งหมดจาก Pancake ให้เลือก ──
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tracked = await prisma.pancakeTrackedPage.findMany({ orderBy: { name: "asc" } });

  const token = process.env.PANCAKE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ tracked, available: [], tokenMissing: true });
  }

  try {
    const available = await fetchActivatedPages(token);
    return NextResponse.json({ tracked, available, tokenMissing: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ tracked, available: [], tokenMissing: false, error: message });
  }
}

// ── PUT /api/admin/pancake-pages — บันทึกรายชื่อเพจที่จะแสดงบน /pancake ทั้งชุด ──
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const pages = Array.isArray(body.pages) ? body.pages : [];
    const clean = pages
      .map((p: unknown) => {
        const obj = p as { pageId?: unknown; name?: unknown };
        return { pageId: String(obj.pageId || "").trim(), name: String(obj.name || "").trim() };
      })
      .filter((p: { pageId: string; name: string }) => p.pageId.length > 0);

    await prisma.$transaction([
      prisma.pancakeTrackedPage.deleteMany({}),
      ...(clean.length > 0
        ? [prisma.pancakeTrackedPage.createMany({ data: clean, skipDuplicates: true })]
        : []),
    ]);

    const tracked = await prisma.pancakeTrackedPage.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ tracked });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
