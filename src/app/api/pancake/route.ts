import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { fetchAllPagesConversations, statsForRange, todayBangkokDateStr, type RawPageConversations } from "@/lib/pancake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// สาธารณะ ไม่ต้อง login — รายชื่อเพจที่แสดงคุมด้วยตาราง PancakeTrackedPage (ตั้งค่าได้ที่ /admin)

// ก้อนบทสนทนาดิบ (ไม่กรองวันที่) แคชไว้สั้นๆ ในหน่วยความจำของ instance นี้ — สลับดูช่วงวันไหนก็
// คำนวณจากก้อนเดียวกัน ไม่ต้องยิง Pancake ใหม่ทุกครั้ง (แคชแบบ per-instance เท่านั้น ไม่ได้แชร์
// ข้าม serverless instance แต่ TTL สั้นพอที่จะไม่เป็นปัญหา)
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { raw: RawPageConversations[]; fetchedAt: number } | null = null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const token = process.env.PANCAKE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า PANCAKE_ACCESS_TOKEN" },
      { status: 503 }
    );
  }

  const today = todayBangkokDateStr();
  const since = req.nextUrl.searchParams.get("since") || today;
  const until = req.nextUrl.searchParams.get("until") || since;
  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)" }, { status: 400 });
  }
  if (since > until) {
    return NextResponse.json({ error: "วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด" }, { status: 400 });
  }
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  try {
    const tracked = await prisma.pancakeTrackedPage.findMany({ orderBy: { name: "asc" } });
    if (tracked.length === 0) {
      return NextResponse.json({
        since,
        until,
        pages: [],
        fetchedAt: new Date().toISOString(),
        cache: { hit: false },
        message: "ยังไม่ได้ตั้งค่าเพจที่จะแสดง — ไปตั้งค่าได้ที่หน้าจัดการระบบ",
      });
    }

    const useCache = !forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    const raw = useCache
      ? cache!.raw
      : await fetchAllPagesConversations(token, tracked.map((t) => ({ pageId: t.pageId, name: t.name })));
    if (!useCache) cache = { raw, fetchedAt: Date.now() };

    const pages = statsForRange(raw, since, until);
    return NextResponse.json({
      since,
      until,
      pages,
      fetchedAt: new Date(cache!.fetchedAt).toISOString(),
      cache: { hit: !!useCache },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ดึงข้อมูลจาก Pancake ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
