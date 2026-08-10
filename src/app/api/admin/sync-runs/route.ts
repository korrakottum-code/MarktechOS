import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/require-admin";

// ── GET /api/admin/sync-runs — recent Meta sync run history ─────────────────
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runs = await prisma.adsSyncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ runs });
}
