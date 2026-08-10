import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/require-admin";

// ── GET /api/admin/report-sets — list saved account selections ──────────────
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sets = await prisma.adsReportSet.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ sets });
}

// ── POST /api/admin/report-sets — create a saved set ─────────────────────────
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const accountIds = Array.isArray(body.accountIds) ? body.accountIds.map(String) : [];
    if (!name) return NextResponse.json({ error: "กรุณาตั้งชื่อชุด" }, { status: 400 });
    if (accountIds.length === 0) return NextResponse.json({ error: "กรุณาเลือกอย่างน้อย 1 บัญชี" }, { status: 400 });

    const set = await prisma.adsReportSet.create({ data: { name, accountIds } });
    return NextResponse.json({ set });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE /api/admin/report-sets?id=... — remove a saved set ───────────────
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });

  try {
    await prisma.adsReportSet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
