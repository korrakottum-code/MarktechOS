import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { AuthenticationError, getPageAccessForCurrentUser } from "@/lib/server/allowed-pages";
import { campaignKind, nameKey, pricePointKey, resolveService, NO_AD, UNKNOWN, type CampaignKind, type ResolvedService } from "@/lib/ad-name";
import { todayBangkokDateStr } from "@/lib/pancake";

// ── GET /api/compare?since=YYYY-MM-DD&until=YYYY-MM-DD&pages=a,b ─────────────
// Compares a date range with the same day numbers of the previous month:
// spend / chats / leads from Meta (AdsContentDaily) and, for pages read from
// Pancake, chat episodes / closes / queues (ChatEpisode).

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Period = "cur" | "prev";

export interface Metrics {
  spend: number;
  inbox: number;
  leads: number;
  chats: number;      // Pancake episodes (only pages read from Pancake)
  closes: number;
  queues: number;
  pending: number;    // phone given, not closed
  newChats: number;
  closes1h: number;
  chatSpend: number;  // spend on pages that have Pancake data (for ฿/close)
}

const zero = (): Metrics => ({ spend: 0, inbox: 0, leads: 0, chats: 0, closes: 0, queues: 0, pending: 0, newChats: 0, closes1h: 0, chatSpend: 0 });
function add(a: Metrics, b: Partial<Metrics>) {
  for (const k of Object.keys(b) as (keyof Metrics)[]) a[k] += b[k] ?? 0;
}

function shiftMonth(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + delta, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const since = sp.get("since") ?? "";
  const until = sp.get("until") ?? "";
  if (!DATE_RE.test(since) || !DATE_RE.test(until) || since > until) {
    return NextResponse.json({ error: "Invalid since/until" }, { status: 400 });
  }
  const requested = (sp.get("pages") ?? "").split(",").filter(Boolean);

  let allowedPages: string[] | null;
  try {
    ({ allowedPages } = await getPageAccessForCurrentUser());
  } catch (err) {
    if (err instanceof AuthenticationError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
  const pageFilter = requested.length
    ? (allowedPages ? requested.filter(p => allowedPages!.includes(p)) : requested)
    : allowedPages;
  if (pageFilter && pageFilter.length === 0) {
    return NextResponse.json({ error: "No accessible pages" }, { status: 403 });
  }

  const prevSince = shiftMonth(since, -1);
  const prevUntil = shiftMonth(until, -1);
  const today = todayBangkokDateStr();
  const curDays = Math.max(1, daysBetween(since, until < today ? until : today));
  const prevDays = daysBetween(prevSince, prevUntil);

  const pageSql = pageFilter ? Prisma.sql`AND "pageId" IN (${Prisma.join(pageFilter)})` : Prisma.empty;
  const periodCase = Prisma.sql`CASE WHEN "date" BETWEEN ${since} AND ${until} THEN 'cur' ELSE 'prev' END`;
  const dateSql = Prisma.sql`(("date" BETWEEN ${since} AND ${until}) OR ("date" BETWEEN ${prevSince} AND ${prevUntil}))`;

  const [adRows, epRows, syncStates, pageNames] = await Promise.all([
    prisma.$queryRaw<{ period: Period; pageId: string; adId: string; adName: string; campaignName: string; spend: number; inbox: bigint; leads: bigint }[]>(Prisma.sql`
      SELECT ${periodCase} AS period, "pageId", "adId", MAX("adName") AS "adName", MAX("campaignName") AS "campaignName",
             SUM(spend)::float8 AS spend, SUM(inbox) AS inbox, SUM(leads) AS leads
      FROM "AdsContentDaily"
      WHERE ${dateSql} AND "pageId" <> '' ${pageSql}
      GROUP BY 1, 2, 3
      HAVING SUM(spend) > 0 OR SUM(inbox) > 0
    `),
    prisma.$queryRaw<{ period: Period; pageId: string; adId: string; adTitle: string; chats: bigint; closes: bigint; queues: bigint; pending: bigint; newChats: bigint; closes1h: bigint }[]>(Prisma.sql`
      SELECT ${periodCase} AS period, "pageId", "adId", MAX("adTitle") AS "adTitle",
             COUNT(*) AS chats,
             COUNT(*) FILTER (WHERE closed) AS closes,
             SUM(CASE WHEN closed THEN GREATEST(queues, 1) ELSE 0 END) AS queues,
             COUNT(*) FILTER (WHERE "phoneGiven" AND NOT closed) AS pending,
             COUNT(*) FILTER (WHERE "isNew") AS "newChats",
             COUNT(*) FILTER (WHERE closed AND "closedAt" <= "startedAt" + INTERVAL '1 hour') AS closes1h
      FROM "ChatEpisode"
      WHERE ${dateSql} ${pageSql}
      GROUP BY 1, 2, 3
    `),
    prisma.chatSyncState.findMany(pageFilter ? { where: { pageId: { in: pageFilter } } } : undefined),
    prisma.pageNameCache.findMany(pageFilter ? { where: { pageId: { in: pageFilter } } } : undefined),
  ]);

  // Chat data only counts for a page when its chat sync has caught up past the range end.
  const rangeEndUtc = Date.parse(`${until}T23:59:59+07:00`);
  const chatPages = new Map<string, { syncedThrough: string; complete: boolean; error: string }>();
  for (const s of syncStates) {
    chatPages.set(s.pageId, {
      syncedThrough: s.cursor.toISOString(),
      complete: s.cursor.getTime() >= Math.min(rangeEndUtc, Date.now() - 3 * 3600_000),
      error: s.lastError,
    });
  }
  // Pages still catching up are left out of every chat number (shown as "syncing"),
  // otherwise half-read months would look like a drop in closes.
  const hasChat = (pageId: string) => chatPages.get(pageId)?.complete === true;
  const completePages = [...chatPages].filter(([, v]) => v.complete).map(([k]) => k);
  const chatPageSql = completePages.length
    ? Prisma.sql`AND "pageId" IN (${Prisma.join(completePages)})`
    : Prisma.sql`AND FALSE`;

  // ── Which service / price each ad sells, and whether it is a sales ad ──────
  // Order: manual mapping → ad name → campaign name → ad copy (see lib/ad-name).
  // Awareness and job-ad campaigns are left out of every number.
  const adIds = [...new Set(adRows.map(r => r.adId))];
  const nameKeys = [...new Set([...adRows.map(r => nameKey(r.adName)), ...epRows.map(r => nameKey(r.adTitle ?? ""))].filter(Boolean))];
  const [mappings, creatives] = await Promise.all([
    nameKeys.length ? prisma.adServiceMap.findMany({ where: { nameKey: { in: nameKeys } } }) : Promise.resolve([]),
    adIds.length ? prisma.adCreativeText.findMany({ where: { adId: { in: adIds } } }) : Promise.resolve([]),
  ]);
  const mappingOf = new Map(mappings.map(m => [m.nameKey, { service: m.service, price: m.price, exclude: m.exclude }]));
  const creativeOf = new Map(creatives.map(c => [c.adId, c.text]));

  const campaignTotals = new Map<string, { spend: number; inbox: number }>();
  for (const r of adRows) {
    const t = campaignTotals.get(r.campaignName) ?? { spend: 0, inbox: 0 };
    t.spend += Number(r.spend); t.inbox += Number(r.inbox);
    campaignTotals.set(r.campaignName, t);
  }
  interface AdInfo { adName: string; campaignName: string; kind: CampaignKind; resolved: ResolvedService; priceKey: string }
  const adInfo = new Map<string, AdInfo>();
  for (const r of adRows) {
    if (adInfo.has(r.adId)) continue;
    const t = campaignTotals.get(r.campaignName)!;
    const resolved = resolveService({
      adName: r.adName, campaignName: r.campaignName,
      creativeText: creativeOf.get(r.adId), mapping: mappingOf.get(nameKey(r.adName)) ?? undefined,
    });
    adInfo.set(r.adId, {
      adName: r.adName, campaignName: r.campaignName, kind: campaignKind(r.campaignName, t.spend, t.inbox),
      resolved, priceKey: pricePointKey(resolved, r.adName),
    });
  }
  const isExcluded = (a: AdInfo) => a.resolved.exclude || a.kind === "awareness" || a.kind === "hr";

  interface Line { period: Period; pageId: string; service: string; priceKey: string; hasPrice: boolean; lead: boolean; m: Partial<Metrics> }
  const lines: Line[] = [];
  const excluded = { cur: { spend: 0, inbox: 0 }, prev: { spend: 0, inbox: 0 }, campaigns: new Map<string, { kind: string; spend: number }>() };
  for (const r of adRows) {
    const a = adInfo.get(r.adId)!;
    const spend = Number(r.spend);
    if (isExcluded(a)) {
      excluded[r.period].spend += spend; excluded[r.period].inbox += Number(r.inbox);
      const c = excluded.campaigns.get(r.campaignName) ?? { kind: a.resolved.exclude ? "manual" : a.kind, spend: 0 };
      c.spend += spend; excluded.campaigns.set(r.campaignName, c);
      continue;
    }
    lines.push({
      period: r.period, pageId: r.pageId, service: a.resolved.service, priceKey: a.priceKey,
      hasPrice: a.resolved.price !== null, lead: a.kind === "lead",
      m: { spend, inbox: Number(r.inbox), leads: Number(r.leads), chatSpend: hasChat(r.pageId) ? spend : 0 },
    });
  }
  for (const r of epRows) {
    if (!hasChat(r.pageId)) continue;
    let service = NO_AD, priceKey = NO_AD, hasPrice = false, lead = false;
    if (r.adId) {
      const a = adInfo.get(r.adId);
      if (a && isExcluded(a)) continue;
      const resolved = a?.resolved ?? resolveService({ adName: r.adTitle ?? "", mapping: mappingOf.get(nameKey(r.adTitle ?? "")) ?? undefined });
      service = resolved.service; hasPrice = resolved.price !== null; lead = a?.kind === "lead";
      priceKey = a?.priceKey ?? pricePointKey(resolved, r.adTitle ?? "");
    }
    lines.push({
      period: r.period, pageId: r.pageId, service, priceKey, hasPrice, lead,
      m: {
        chats: Number(r.chats), closes: Number(r.closes), queues: Number(r.queues),
        pending: Number(r.pending), newChats: Number(r.newChats), closes1h: Number(r.closes1h),
      },
    });
  }
  const serviceOfPriceKey = new Map(lines.map(l => [l.priceKey, l.service]));

  type Row = { key: string; cur: Metrics; prev: Metrics; meta?: Record<string, unknown> };
  function group(keyOf: (l: Line) => string): Row[] {
    const map = new Map<string, Row>();
    for (const l of lines) {
      const k = keyOf(l);
      let row = map.get(k);
      if (!row) { row = { key: k, cur: zero(), prev: zero() }; map.set(k, row); }
      add(row[l.period], l.m);
    }
    return [...map.values()].sort((a, b) => b.cur.spend - a.cur.spend || b.prev.spend - a.prev.spend);
  }

  const nameOfPage = new Map(pageNames.map(p => [p.pageId, p.pageName]));
  const overview = group(() => "all")[0] ?? { key: "all", cur: zero(), prev: zero() };
  const byPage = group(l => l.pageId).map(r => ({
    ...r,
    pageName: nameOfPage.get(r.key) || r.key,
    chatSource: chatPages.has(r.key) ? (chatPages.get(r.key)!.complete ? "pancake" : "pancake-partial") : "none",
  }));
  const svcKey = (l: Line) => l.service;
  const priceKeyOf = (l: Line) => l.priceKey;
  const byService = group(svcKey);
  const byPrice = group(priceKeyOf)
    .filter(r => r.key === NO_AD || Math.max(r.cur.inbox, r.prev.inbox, r.cur.chats, r.prev.chats) >= 10)
    .map(r => ({ ...r, service: serviceOfPriceKey.get(r.key) ?? UNKNOWN }));

  // ── Decomposition ─────────────────────────────────────────────────────────
  // Chat level: expected chats = Σ current spend ÷ last month's ฿/chat for the same
  // price key (falling back to its service, then the overall rate).
  const priceRows = group(priceKeyOf);
  const svcRows = new Map(byService.map(r => [r.key, r]));
  const overallPrevCpi = overview.prev.inbox > 0 ? overview.prev.spend / overview.prev.inbox : 0;
  let expectedChats = 0;
  for (const r of priceRows) {
    if (r.cur.spend <= 0) continue;
    const svc = svcRows.get(serviceOfPriceKey.get(r.key) ?? UNKNOWN);
    const cpi = r.prev.inbox > 0 ? r.prev.spend / r.prev.inbox
      : svc && svc.prev.inbox > 0 ? svc.prev.spend / svc.prev.inbox
      : overallPrevCpi;
    if (cpi > 0) expectedChats += r.cur.spend / cpi;
  }
  const chatDecomp = overallPrevCpi > 0 ? {
    actual: overview.cur.inbox,
    prevActual: overview.prev.inbox,
    atPrevRate: overview.cur.spend / overallPrevCpi,
    expected: expectedChats,
    mixEffect: expectedChats - overview.cur.spend / overallPrevCpi,
    efficiencyEffect: overview.cur.inbox - expectedChats,
  } : null;

  // Close level (skill §4.5), Pancake pages only: expected closes = Σ current chats ×
  // last month's close % of the same price key.
  const chatLines = lines.filter(l => hasChat(l.pageId));
  const closeMap = new Map<string, Row>();
  for (const l of chatLines) {
    const k = priceKeyOf(l);
    let row = closeMap.get(k);
    if (!row) { row = { key: k, cur: zero(), prev: zero() }; closeMap.set(k, row); }
    add(row[l.period], l.m);
  }
  const closeTotals = { cur: zero(), prev: zero() };
  for (const r of closeMap.values()) { add(closeTotals.cur, r.cur); add(closeTotals.prev, r.prev); }
  const prevCloseRate = closeTotals.prev.chats > 0 ? closeTotals.prev.closes / closeTotals.prev.chats : 0;
  let expectedCloses = 0;
  for (const r of closeMap.values()) {
    if (r.cur.chats <= 0) continue;
    const rate = r.prev.chats >= 5 ? r.prev.closes / r.prev.chats : prevCloseRate;
    expectedCloses += r.cur.chats * rate;
  }
  const closeDecomp = closeTotals.prev.chats > 0 && closeTotals.cur.chats > 0 ? {
    actual: closeTotals.cur.closes,
    prevActual: closeTotals.prev.closes,
    atPrevRate: closeTotals.cur.chats * prevCloseRate,
    expected: expectedCloses,
    mixEffect: expectedCloses - closeTotals.cur.chats * prevCloseRate,
    rateEffect: closeTotals.cur.closes - expectedCloses,
  } : null;

  // ── Flags (ad-side suggestions) ────────────────────────────────────────────
  type Flag = { level: "warn" | "info" | "good"; pageId?: string; pageName?: string; key?: string; text: string; impact: number };
  const flags: Flag[] = [];
  const pagePrice = new Map<string, Row[]>();
  {
    const perPage = new Map<string, Map<string, Row>>();
    for (const l of lines) {
      let m = perPage.get(l.pageId);
      if (!m) { m = new Map(); perPage.set(l.pageId, m); }
      const k = `${l.priceKey}\u0001${l.lead ? 1 : 0}`;
      let row = m.get(k);
      if (!row) { row = { key: l.priceKey, cur: zero(), prev: zero(), meta: { lead: l.lead, hasPrice: l.hasPrice, service: l.service } }; m.set(k, row); }
      add(row[l.period], l.m);
    }
    for (const [pid, m] of perPage) pagePrice.set(pid, [...m.values()]);
  }
  for (const page of byPage) {
    const rows = pagePrice.get(page.key) ?? [];
    const pc = page.cur;
    const name = page.pageName;
    if (pc.spend < 1000) continue;
    const pageCpi = pc.inbox > 0 ? pc.spend / pc.inbox : 0;
    const pageCpl = pc.leads > 0 ? pc.spend / pc.leads : 0;
    const pageCpc = pc.closes > 0 ? pc.chatSpend / pc.closes : 0;
    let unpricedSpend = 0;
    for (const r of rows) {
      if (r.key === NO_AD) continue;
      const c = r.cur, p = r.prev;
      const lead = r.meta?.lead === true;
      if (c.spend > 0 && !r.meta?.hasPrice) unpricedSpend += c.spend;
      const cpi = c.inbox > 0 ? c.spend / c.inbox : Infinity;
      // Lead campaigns are optimized for people who leave a lead, so judge them by ฿/lead.
      if (lead) {
        const cpl = c.leads > 0 ? c.spend / c.leads : Infinity;
        if (pageCpl > 0 && c.spend >= pc.spend * 0.05 && cpl > pageCpl * 1.5) {
          flags.push({ level: "warn", pageId: page.key, pageName: name, key: r.key, impact: c.spend - c.leads * pageCpl,
            text: `${r.key} (แคมเปญ Lead): ฿/ลีด ${fmt(cpl)} สูงกว่าค่าเฉลี่ยเพจ (${fmt(pageCpl)}) เกิน 1.5 เท่า ใช้งบ ${pctOf(c.spend, pc.spend)} ของเพจ — ลดงบ ~10% หรือเปลี่ยนภาพ` });
        }
      } else if (pageCpi > 0 && c.spend >= pc.spend * 0.05 && cpi > pageCpi * 1.5) {
        flags.push({ level: "warn", pageId: page.key, pageName: name, key: r.key, impact: c.spend - c.inbox * pageCpi,
          text: `${r.key}: ฿/แชท ${fmt(cpi)} สูงกว่าค่าเฉลี่ยเพจ (${fmt(pageCpi)}) เกิน 1.5 เท่า ใช้งบ ${pctOf(c.spend, pc.spend)} ของเพจ — ลดงบ ~10% หรือเปลี่ยนภาพ` });
      }
      if (page.chatSource !== "none" && c.closes > 0 && pageCpc > 0) {
        const cpc = c.spend / c.closes;
        if (c.spend >= pc.spend * 0.05 && cpc > pageCpc * 1.5) {
          flags.push({ level: "warn", pageId: page.key, pageName: name, key: r.key, impact: c.spend - c.closes * pageCpc,
            text: `${r.key}: ฿/ปิด ${fmt(cpc)} สูงกว่าค่าเฉลี่ยเพจ (${fmt(pageCpc)}) เกิน 1.5 เท่า — ย้ายงบไปตัวที่ ฿/ปิด ต่ำกว่า` });
        } else if (c.closes >= 3 && cpc < pageCpc * 0.7) {
          flags.push({ level: "good", pageId: page.key, pageName: name, key: r.key, impact: c.closes * pageCpc - c.spend,
            text: `${r.key}: ฿/ปิด ${fmt(cpc)} ต่ำกว่าค่าเฉลี่ยเพจ (${fmt(pageCpc)}) — เพิ่มงบทีละ 10% แล้วรอ 3–4 วัน` });
        }
      }
      if (p.spend >= 2000 && p.inbox > 0) {
        const prevCpi = p.spend / p.inbox;
        const prevPageCpi = page.prev.inbox > 0 ? page.prev.spend / page.prev.inbox : 0;
        const curSpendPerDay = c.spend / curDays, prevSpendPerDay = p.spend / prevDays;
        if (prevPageCpi > 0 && prevCpi < prevPageCpi * 0.8 && curSpendPerDay < prevSpendPerDay * 0.7) {
          flags.push({ level: "info", pageId: page.key, pageName: name, key: r.key, impact: (prevSpendPerDay - curSpendPerDay) * curDays,
            text: `${r.key}: เดือนก่อน ฿/แชท ${fmt(prevCpi)} ดีกว่าค่าเฉลี่ย แต่เดือนนี้งบ/วันลดลง ${pctChange(curSpendPerDay, prevSpendPerDay)} — ลองเปิดกลับ` });
        }
      }
    }
    const unknownSpend = rows.filter(r => r.meta?.service === UNKNOWN).reduce((a, r) => a + r.cur.spend, 0);
    if (unknownSpend >= pc.spend * 0.2) {
      flags.push({ level: "info", pageId: page.key, pageName: name, impact: unknownSpend * 0.012,
        text: `งบ ${pctOf(unknownSpend, pc.spend)} ของเพจอยู่ในแอดที่ระบบไม่รู้ว่าเป็นบริการอะไร — ผูกบริการได้ที่ส่วน "แอดที่ยังไม่รู้บริการ" ด้านล่าง` });
    } else if (unpricedSpend >= pc.spend * 0.2) {
      flags.push({ level: "info", pageId: page.key, pageName: name, impact: unpricedSpend * 0.01,
        text: `แอดที่ชื่อไม่มีราคาใช้งบ ${pctOf(unpricedSpend, pc.spend)} ของเพจ — แอด Message ควรมีราคาในภาพ และตั้งชื่อ "บริการ+ราคา" เพื่อให้วัดผลรายราคาได้` });
    }
    if (pc.inbox >= 100 && pc.leads > 0 && pc.leads / pc.inbox < 0.05) {
      flags.push({ level: "info", pageId: page.key, pageName: name, impact: pc.spend * 0.05,
        text: `แชท→ลีด แค่ ${pctOf(pc.leads, pc.inbox)} — เช็กว่าเพจนี้ตั้งการติดลีดครบหรือยัง` });
    }
    const pp = page.prev;
    if (pp.inbox >= 50 && pc.spend / curDays >= (pp.spend / prevDays) * 0.9 && pc.inbox / curDays < (pp.inbox / prevDays) * 0.75) {
      flags.push({ level: "warn", pageId: page.key, pageName: name, impact: pc.spend * 0.25,
        text: `งบ/วันใกล้เดิมแต่แชท/วันลด ${pctChange(pc.inbox / curDays, pp.inbox / prevDays)} — ภาพแอดอาจล้า ลองเปลี่ยนภาพ` });
    }
  }
  // Biggest money first; at most 3 per page so one page cannot flood the list.
  flags.sort((a, b) => b.impact - a.impact);
  const perPageCount = new Map<string, number>();
  const topFlags = flags.filter(f => {
    const n = perPageCount.get(f.pageId ?? "") ?? 0;
    perPageCount.set(f.pageId ?? "", n + 1);
    return n < 3;
  }).slice(0, 40);

  // Hour of day: chats and closes within 1h by the hour the chat started (Pancake pages).
  const hourRows = await prisma.$queryRaw<{ hour: number; chats: bigint; closes: bigint; closes1h: bigint }[]>(Prisma.sql`
    SELECT hour, COUNT(*) AS chats, COUNT(*) FILTER (WHERE closed) AS closes,
           COUNT(*) FILTER (WHERE closed AND "closedAt" <= "startedAt" + INTERVAL '1 hour') AS closes1h
    FROM "ChatEpisode" WHERE "date" BETWEEN ${since} AND ${until} ${pageSql} ${chatPageSql}
    GROUP BY 1 ORDER BY 1
  `);
  const medianRow = await prisma.$queryRaw<{ median: number | null }[]>(Prisma.sql`
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("closedAt" - "startedAt")) / 60)::float8 AS median
    FROM "ChatEpisode" WHERE closed AND "date" BETWEEN ${since} AND ${until} ${pageSql} ${chatPageSql}
  `);

  // Ads the team still needs to map (unknown service), biggest spend first.
  const unknownMap = new Map<string, { nameKey: string; adName: string; campaignName: string; pages: Set<string>; spend: number; inbox: number; adId: string }>();
  for (const r of adRows) {
    const a = adInfo.get(r.adId)!;
    if (a.resolved.source !== "unknown" || isExcluded(a)) continue;
    const k = nameKey(r.adName);
    const u = unknownMap.get(k) ?? { nameKey: k, adName: r.adName, campaignName: r.campaignName, pages: new Set<string>(), spend: 0, inbox: 0, adId: r.adId };
    u.spend += Number(r.spend); u.inbox += Number(r.inbox); u.pages.add(r.pageId);
    unknownMap.set(k, u);
  }
  const unknownAds = [...unknownMap.values()].sort((a, b) => b.spend - a.spend).slice(0, 60).map(u => ({
    nameKey: u.nameKey, adName: u.adName, campaignName: u.campaignName, spend: u.spend, inbox: u.inbox,
    pages: [...u.pages].map(p => nameOfPage.get(p) || p),
    creativeText: (creativeOf.get(u.adId) ?? "").slice(0, 300),
  }));
  const mappedAds = mappings.map(m => ({ nameKey: m.nameKey, service: m.service, price: m.price, exclude: m.exclude }));

  return NextResponse.json({
    ranges: { cur: { since, until, days: curDays }, prev: { since: prevSince, until: prevUntil, days: prevDays } },
    overview,
    chatOverview: closeTotals,
    byPage,
    byService,
    byPrice,
    decomposition: { chats: chatDecomp, closes: closeDecomp },
    flags: topFlags,
    flagsTotal: flags.length,
    hours: hourRows.map(h => ({ hour: h.hour, chats: Number(h.chats), closes: Number(h.closes), closes1h: Number(h.closes1h) })),
    medianMinutesToClose: medianRow[0]?.median ?? null,
    chatCoverage: Object.fromEntries(chatPages),
    excluded: {
      cur: excluded.cur, prev: excluded.prev,
      campaigns: [...excluded.campaigns].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.spend - a.spend).slice(0, 30),
    },
    unknownAds,
    mappedAds,
    services: [...new Set(lines.map(l => l.service))].filter(s => s !== UNKNOWN && s !== NO_AD).sort(),
  });
}

function fmt(n: number) { return `฿${Math.round(n).toLocaleString("en-US")}`; }
function pctOf(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 100)}%` : "—"; }
function pctChange(a: number, b: number) { return b > 0 ? `${Math.round(((b - a) / b) * 100)}%` : "—"; }
