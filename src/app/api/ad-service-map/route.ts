import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireTeamMember } from "@/lib/server/require-team";
import { nameKey } from "@/lib/ad-name";

// Manual service/price for an ad name (used by /compare). Team members only.
// POST { adName, service, price?, exclude? } saves; DELETE ?nameKey= removes.

export async function POST(req: NextRequest) {
  const user = await requireTeamMember();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { adName?: string; service?: string; price?: number | string | null; exclude?: boolean } | null;
  const key = nameKey(body?.adName ?? "");
  const service = (body?.service ?? "").trim().toLowerCase().slice(0, 80);
  const exclude = body?.exclude === true;
  const priceNum = body?.price === null || body?.price === undefined || body?.price === "" ? null : Number(body.price);
  if (!key) return NextResponse.json({ error: "adName is required" }, { status: 400 });
  if (!service && !exclude) return NextResponse.json({ error: "Choose a service or mark it as not a sales ad" }, { status: 400 });
  if (priceNum !== null && (!Number.isInteger(priceNum) || priceNum < 0 || priceNum > 10_000_000)) {
    return NextResponse.json({ error: "Price must be a whole number" }, { status: 400 });
  }

  const data = { service: exclude ? "" : service, price: exclude ? null : priceNum, exclude, updatedBy: user.email ?? user.id };
  const saved = await prisma.adServiceMap.upsert({ where: { nameKey: key }, create: { nameKey: key, ...data }, update: data });
  return NextResponse.json({ mapping: { nameKey: saved.nameKey, service: saved.service, price: saved.price, exclude: saved.exclude } });
}

export async function DELETE(req: NextRequest) {
  const user = await requireTeamMember();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = nameKey(req.nextUrl.searchParams.get("nameKey") ?? "");
  if (!key) return NextResponse.json({ error: "nameKey is required" }, { status: 400 });
  await prisma.adServiceMap.deleteMany({ where: { nameKey: key } });
  return NextResponse.json({ ok: true });
}
