import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { requireSyncAuthorization } from "@/lib/server/sync-auth";
import { chatSyncPages, syncPageChats, type PageSyncResult } from "@/lib/server/chat-sync";
import { fetchMissingCreativeTexts } from "@/lib/server/ad-creative-text";

// Reads Pancake chats for pages that run ads and stores close outcomes
// (ChatEpisode). Runs often; each run continues from each page's cursor, so a
// run cut short loses nothing. Pages that waited longest go first.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUDGET_MS = 250_000;
const LEASE_MS = 5.5 * 60_000;
const LOCK_KEY = "pancake-chats";

export async function GET(req: NextRequest) {
  const unauthorized = await requireSyncAuthorization(req);
  if (unauthorized) return unauthorized;

  const token = process.env.PANCAKE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "PANCAKE_ACCESS_TOKEN is not set" }, { status: 503 });

  const start = Date.now();
  const now = new Date();
  const lock = await prisma.$queryRaw<{ key: string }[]>(Prisma.sql`
    INSERT INTO "AdsSyncLock" ("key", "lockedUntil", "updatedAt")
    VALUES (${LOCK_KEY}, ${new Date(start + LEASE_MS)}, ${now})
    ON CONFLICT ("key") DO UPDATE
      SET "lockedUntil" = EXCLUDED."lockedUntil", "updatedAt" = EXCLUDED."updatedAt"
      WHERE "AdsSyncLock"."lockedUntil" < ${now}
    RETURNING "key"
  `);
  if (lock.length === 0) return NextResponse.json({ error: "A chat sync is already running" }, { status: 409 });

  const deadline = start + BUDGET_MS;
  const results: PageSyncResult[] = [];
  let creativeTexts = 0;
  try {
    // Ad copy for ads whose service isn't in the name (used by /compare). Small and capped.
    creativeTexts = await fetchMissingCreativeTexts(150, start + 30_000).catch(err => {
      console.error(JSON.stringify({ event: "ad_creative_text_failed", message: String(err) }));
      return 0;
    });
    const only = req.nextUrl.searchParams.get("pages")?.split(",").filter(Boolean);
    let pages = await chatSyncPages(token);
    if (only?.length) pages = pages.filter(p => only.includes(p.id));
    const states = await prisma.chatSyncState.findMany({ where: { pageId: { in: pages.map(p => p.id) } } });
    const lastRun = new Map(states.map(s => [s.pageId, s.lastRunAt?.getTime() ?? 0]));
    pages.sort((a, b) => (lastRun.get(a.id) ?? 0) - (lastRun.get(b.id) ?? 0));

    for (const page of pages) {
      if (Date.now() > deadline - 15_000) break;
      results.push(await syncPageChats(page, token, deadline));
    }
    const summary = {
      event: "pancake_chat_sync",
      creativeTexts,
      pagesTotal: pages.length,
      pagesRun: results.length,
      caughtUp: results.filter(r => r.done).length,
      conversations: results.reduce((a, r) => a + r.conversations, 0),
      episodes: results.reduce((a, r) => a + r.episodes, 0),
      errors: results.filter(r => r.error).map(r => `${r.name}: ${r.error}`),
      ms: Date.now() - start,
    };
    console.log(JSON.stringify(summary));
    return NextResponse.json({ ...summary, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "pancake_chat_sync_failed", message }));
    return NextResponse.json({ error: message, results }, { status: 500 });
  } finally {
    await prisma.adsSyncLock.delete({ where: { key: LOCK_KEY } }).catch(() => {});
  }
}
