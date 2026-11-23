// Reads chats from Pancake page by page and stores per-episode outcomes
// (ChatEpisode). Only outcomes are stored — no names, phone numbers or text.
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { analyzeConversation, type ChatLine, type EpisodeState } from "@/lib/chat-close";

const API = "https://pages.fm/api/v1";
/** Chats before this are not tracked (first run backfills from here). */
export const CHAT_FLOOR = Date.parse("2026-10-01T00:00:00+07:00");
const LIST_PAGE_CAP = 150;           // × 60 conversations
const MESSAGE_CALL_CAP = 12;         // × ~25 messages per conversation
const CONCURRENCY = 6;
const DAY = 86400000;

// Pancake returns naive ISO timestamps; for this account they are UTC.
const ts = (s: string | null | undefined) => (s ? Date.parse(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : NaN);

async function pancake<T>(path: string, token: string): Promise<T> {
  const url = `${API}/${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { cache: "no-store" });
    const type = res.headers.get("content-type") || "";
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
    }
    if (!type.includes("application/json")) throw new Error(`Pancake HTTP ${res.status} (token may have expired)`);
    const data = await res.json();
    if (data?.success === false) throw new Error(data.message || "Pancake API error");
    return data as T;
  }
}

interface Conv {
  id: string;
  type: string;
  inserted_at: string;
  updated_at: string;
  customers?: { id: string }[];
}
interface Msg {
  id: string;
  inserted_at: string;
  from?: { id?: string };
  original_message?: string;
  message?: string;
  attachments?: { type?: string }[];
}
interface MsgResponse {
  messages?: Msg[];
  ad_clicks?: Record<string, { ad_id: string; inserted_at: string }[]>;
  activities?: { ad_id?: string; ads_context_data?: { ad_title?: string } }[];
}

const hashConv = (id: string) => createHash("sha256").update(id).digest("hex").slice(0, 32);
const bkk = (ms: number) => new Date(ms + 7 * 3600_000);
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ");

/** Pages to read: Pancake Facebook pages that had ad spend in the last 60 days. */
export async function chatSyncPages(token: string): Promise<{ id: string; name: string }[]> {
  const data = await pancake<{ categorized?: { activated?: { id: string; name: string; platform: string }[] } }>("pages", token);
  const pancakePages = (data.categorized?.activated ?? []).filter(p => p.platform === "facebook");
  const since = new Date(Date.now() - 60 * DAY).toISOString().slice(0, 10);
  const withAds = await prisma.$queryRaw<{ pageId: string }[]>(Prisma.sql`
    SELECT DISTINCT "pageId" FROM "AdsContentDaily" WHERE "date" >= ${since} AND spend > 0 AND "pageId" <> ''
  `);
  const adPages = new Set(withAds.map(r => r.pageId));
  return pancakePages.filter(p => adPages.has(p.id)).map(p => ({ id: p.id, name: p.name }));
}

async function processConversation(pageId: string, conv: Conv, token: string): Promise<number> {
  const customerId = conv.customers?.[0]?.id;
  if (!customerId) return 0;
  const convHash = hashConv(conv.id);
  const stored = await prisma.chatEpisode.findMany({ where: { convHash } });
  const existing: (EpisodeState & { id: string })[] = stored.map(s => ({
    id: s.id, startedAt: s.startedAt.getTime(), adId: s.adId, adTitle: s.adTitle, isNew: s.isNew,
    closed: s.closed, closedAt: s.closedAt?.getTime() ?? null, queues: s.queues, phoneGiven: s.phoneGiven,
    lastActivityAt: s.lastActivityAt.getTime(),
  }));
  const processedUntil = existing.reduce((m, e) => Math.max(m, e.lastActivityAt), 0);
  // First pass: look back far enough to see a week of silence before the floor.
  const fetchBackTo = processedUntil > 0 ? processedUntil - DAY : CHAT_FLOOR - 8 * DAY;

  const byId = new Map<string, Msg>();
  let adClicks: { adId: string; at: number }[] = [];
  const adTitles = new Map<string, string>();
  let historyStart = -Infinity;
  let count = 0;
  for (let call = 0; call < MESSAGE_CALL_CAP; call++) {
    const r = await pancake<MsgResponse>(
      `pages/${pageId}/conversations/${conv.id}/messages?customer_id=${customerId}&current_count=${count}`, token);
    if (call === 0) {
      // ad_clicks lists can contain nulls.
      adClicks = Object.values(r.ad_clicks ?? {})
        .flatMap(v => (Array.isArray(v) ? v : []))
        .filter((c): c is { ad_id: string; inserted_at: string } => !!c && !!c.ad_id)
        .map(c => ({ adId: c.ad_id, at: ts(c.inserted_at) }))
        .filter(c => !Number.isNaN(c.at));
      for (const a of r.activities ?? []) if (a.ad_id && a.ads_context_data?.ad_title) adTitles.set(a.ad_id, a.ads_context_data.ad_title);
    }
    const batch = r.messages ?? [];
    if (batch.length === 0) { historyStart = -Infinity; break; }
    let fresh = 0;
    for (const m of batch) if (!byId.has(m.id)) { byId.set(m.id, m); fresh++; }
    count += batch.length;
    const oldest = Math.min(...batch.map(m => ts(m.inserted_at)));
    historyStart = oldest;
    if (fresh === 0 || oldest < fetchBackTo) break;
  }

  const lines: ChatLine[] = [...byId.values()]
    .map(m => ({
      who: (m.from?.id === pageId ? "A" : "C") as "A" | "C",
      at: ts(m.inserted_at),
      text: stripHtml(m.original_message ?? m.message ?? ""),
      photo: (m.attachments ?? []).some(a => a.type === "photo" || a.type === "image"),
    }))
    .filter(l => !Number.isNaN(l.at))
    .sort((a, b) => a.at - b.at);

  const changed = analyzeConversation({
    lines, adClicks, adTitles, convCreatedAt: ts(conv.inserted_at), existing,
    processedUntil, floor: CHAT_FLOOR, historyStart,
  });

  for (const e of changed) {
    const id = (e as { id?: string }).id ?? `${convHash}|${new Date(e.startedAt).toISOString()}`;
    const local = bkk(e.startedAt);
    const data = {
      pageId, convHash, adId: e.adId, adTitle: e.adTitle.slice(0, 200),
      startedAt: new Date(e.startedAt), date: local.toISOString().slice(0, 10), hour: local.getUTCHours(),
      isNew: e.isNew, closed: e.closed, closedAt: e.closedAt ? new Date(e.closedAt) : null,
      queues: e.queues, phoneGiven: e.phoneGiven, lastActivityAt: new Date(e.lastActivityAt),
    };
    await prisma.chatEpisode.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  return changed.length;
}

export interface PageSyncResult { pageId: string; name: string; conversations: number; episodes: number; done: boolean; error?: string }

/** Syncs one page from its cursor until caught up or the deadline. */
export async function syncPageChats(page: { id: string; name: string }, token: string, deadline: number): Promise<PageSyncResult> {
  const state = await prisma.chatSyncState.findUnique({ where: { pageId: page.id } });
  const cursor = state?.cursor.getTime() ?? CHAT_FLOOR;
  const result: PageSyncResult = { pageId: page.id, name: page.name, conversations: 0, episodes: 0, done: false };
  try {
    // List conversations updated after the cursor (newest first from Pancake).
    const convs: Conv[] = [];
    let reachedCursor = false;
    for (let p = 0, count = 0; p < LIST_PAGE_CAP; p++) {
      const r = await pancake<{ conversations?: Conv[] }>(
        `pages/${page.id}/conversations?page_id=${page.id}&type=INBOX&current_count=${count}`, token);
      const batch = r.conversations ?? [];
      if (batch.length === 0) { reachedCursor = true; break; }
      count += batch.length;
      for (const c of batch) if (ts(c.updated_at) > cursor) convs.push(c);
      if (ts(batch[batch.length - 1].updated_at) <= cursor) { reachedCursor = true; break; }
      if (Date.now() > deadline) break;
    }
    if (!reachedCursor) throw new Error("Conversation list did not reach the cursor in time; will retry");

    // Oldest first, so the cursor can advance safely after each batch.
    convs.sort((a, b) => ts(a.updated_at) - ts(b.updated_at));
    let newCursor = cursor;
    for (let i = 0; i < convs.length; i += CONCURRENCY) {
      if (Date.now() > deadline) break;
      const batch = convs.slice(i, i + CONCURRENCY);
      const counts = await Promise.all(batch.map(c => processConversation(page.id, c, token)));
      result.conversations += batch.length;
      result.episodes += counts.reduce((a, b) => a + b, 0);
      newCursor = Math.max(newCursor, ...batch.map(c => ts(c.updated_at)));
      await prisma.chatSyncState.upsert({
        where: { pageId: page.id },
        create: { pageId: page.id, cursor: new Date(newCursor), lastRunAt: new Date(), convsTotal: batch.length },
        update: { cursor: new Date(newCursor), lastRunAt: new Date(), lastError: "", convsTotal: { increment: batch.length } },
      });
    }
    result.done = result.conversations === convs.length;
    if (result.done) {
      // Caught up: record the run even when there was nothing new.
      await prisma.chatSyncState.upsert({
        where: { pageId: page.id },
        create: { pageId: page.id, cursor: new Date(Math.max(newCursor, cursor)), lastRunAt: new Date() },
        update: { lastRunAt: new Date(), lastError: "" },
      });
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    await prisma.chatSyncState.upsert({
      where: { pageId: page.id },
      create: { pageId: page.id, cursor: new Date(cursor), lastRunAt: new Date(), lastError: result.error.slice(0, 500) },
      update: { lastRunAt: new Date(), lastError: result.error.slice(0, 500) },
    });
  }
  return result;
}
