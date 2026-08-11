import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuthenticationError, getPageAccessForCurrentUser } from "@/lib/server/allowed-pages";

// ── GET /api/ads-data?since=YYYY-MM-DD&until=YYYY-MM-DD&pageId=xxx ───────────
// Queries daily rows from AdsMetricDaily and aggregates per campaign.
// When pageId is provided, also returns dailyTrend + adContent.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const since  = searchParams.get("since") ?? "";
  const until  = searchParams.get("until") ?? "";
  const pageId = searchParams.get("pageId") ?? "";
  const pagesParam = searchParams.get("pages") ?? "";
  const requestedPages = pagesParam ? pagesParam.split(",").filter(Boolean) : null;

  try {
    // ── Check user's allowed pages (page-level access control) ────────────
    const { allowedPages } = await getPageAccessForCurrentUser();

    // A report-set's `pages` narrows the query itself (not just what's
    // rendered client-side) — always intersected with allowedPages so a
    // hand-edited URL can never widen a client's actual access.
    const effectivePages = requestedPages
      ? (allowedPages ? requestedPages.filter(id => allowedPages.includes(id)) : requestedPages)
      : allowedPages;

    // Build date filter
    const where: any = {};
    if (since && until) {
      where.date = { gte: since, lte: until };
    }
    if (pageId) {
      // If user requests a specific page, verify they have access
      if (allowedPages && !allowedPages.includes(pageId)) {
        return NextResponse.json({ error: "Access denied to this page" }, { status: 403 });
      }
      where.pageId = pageId;
    } else if (effectivePages) {
      where.pageId = { in: effectivePages };
    }

    const rows = await prisma.adsMetricDaily.findMany({
      where,
      orderBy: [{ clinicName: "asc" }, { date: "asc" }],
    });

    // ── Aggregate daily rows → 1 row per campaign ─────────────────────────
    const campaignMap = new Map<string, {
      campaignId: string; clinic: string; pageName: string; pageId: string;
      adAccountId: string; campaign: string; spend: number; inbox: number;
      leads: number; impressions: number; clicks: number; status: string;
      minDate: string; maxDate: string; dayCount: number;
    }>();

    for (const row of rows) {
      const key = row.campaignId;
      const existing = campaignMap.get(key);

      if (existing) {
        existing.spend       += row.spend;
        existing.inbox       += row.inbox;
        existing.leads       += row.leads;
        existing.impressions += row.impressions;
        existing.clicks      += row.clicks;
        existing.dayCount    += 1;
        if (row.date < existing.minDate) existing.minDate = row.date;
        if (row.date > existing.maxDate) existing.maxDate = row.date;
        if (row.date >= existing.maxDate) {
          existing.status   = row.status;
          existing.pageName = row.pageName || existing.pageName;
          existing.pageId   = row.pageId || existing.pageId;
        }
      } else {
        campaignMap.set(key, {
          campaignId:  row.campaignId,
          clinic:      row.clinicName,
          pageName:    row.pageName,
          pageId:      row.pageId,
          adAccountId: row.adAccountId,
          campaign:    row.campaign,
          spend:       row.spend,
          inbox:       row.inbox,
          leads:       row.leads,
          impressions: row.impressions,
          clicks:      row.clicks,
          status:      row.status,
          minDate:     row.date,
          maxDate:     row.date,
          dayCount:    1,
        });
      }
    }

    // ── Recalculate derived metrics ───────────────────────────────────────
    const adsMetricsRaw = [...campaignMap.values()].map(m => ({
      id:          m.campaignId,
      clinic:      m.clinic,
      pageName:    m.pageName,
      pageId:      m.pageId,
      adAccountId: m.adAccountId,
      campaign:    m.campaign,
      spend:       m.spend,
      inbox:       m.inbox,
      cpi:         m.inbox > 0 ? m.spend / m.inbox : 0,
      leads:       m.leads,
      cpl:         m.leads > 0 ? m.spend / m.leads : 0,
      roas:        0,
      impressions: m.impressions,
      clicks:      m.clicks,
      ctr:         m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      creative:    "",
      status:      m.status as "active" | "paused" | "ended",
    }));

    // ── Fill missing page names from PageNameCache ────────────────────────
    // Many rows may have empty pageName or pageName = clinic (ad account name).
    // Look up real names from PageNameCache to ensure proper display.
    const INVALID_PAGE_NAMES = new Set([
      "facebook", "log in to facebook", "log into facebook",
      "เข้าสู่ระบบ facebook", "เกิดข้อผิดพลาด", "page not found",
      "content not found", "ลงชื่อเข้าใช้ facebook",
    ]);
    const isInvalidPageName = (n: string) => !n || INVALID_PAGE_NAMES.has(n.toLowerCase());

    const pageIdsNeedingName = new Set<string>();
    for (const m of adsMetricsRaw) {
      if (m.pageId && (!m.pageName || m.pageName === m.clinic || m.pageName === m.pageId || isInvalidPageName(m.pageName))) {
        pageIdsNeedingName.add(m.pageId);
      }
    }

    let pageNameLookup = new Map<string, string>();
    if (pageIdsNeedingName.size > 0) {
      const cached = await prisma.pageNameCache.findMany({
        where: { pageId: { in: [...pageIdsNeedingName] } },
      });
      for (const c of cached) {
        if (c.pageName && !isInvalidPageName(c.pageName)) {
          pageNameLookup.set(c.pageId, c.pageName);
        }
      }
    }

    const adsMetrics = adsMetricsRaw.map(m => {
      // Use cached name if available
      if (m.pageId && pageNameLookup.has(m.pageId)) {
        return { ...m, pageName: pageNameLookup.get(m.pageId)! };
      }
      // Clear invalid page names so frontend falls back to pageId
      if (isInvalidPageName(m.pageName)) {
        return { ...m, pageName: "" };
      }
      return m;
    });

    // ── Data availability metadata ───────────────────────────────────────
    let dataMinDate = "";
    let dataMaxDate = "";
    if (rows.length > 0) {
      dataMinDate = rows[0].date;
      dataMaxDate = rows[rows.length - 1].date;
      for (const r of rows) {
        if (r.date < dataMinDate) dataMinDate = r.date;
        if (r.date > dataMaxDate) dataMaxDate = r.date;
      }
    }

    // Find most recent updatedAt as "last synced" indicator
    let lastSyncedAt: string | null = null;
    if (rows.length > 0) {
      let latest = rows[0].updatedAt;
      for (const r of rows) {
        if (r.updatedAt > latest) latest = r.updatedAt;
      }
      lastSyncedAt = latest.toISOString();
    }

    // ── Page-specific: daily trend + ad content ──────────────────────────
    let dailyTrend: any[] | undefined;
    let adContent: any[] | undefined;
    const responseExtra: Record<string, any> = {};

    if (pageId) {
      // Daily trend: aggregate by date
      const trendMap = new Map<string, { date: string; spend: number; inbox: number; leads: number; impressions: number }>();
      for (const r of rows) {
        const e = trendMap.get(r.date);
        if (e) {
          e.spend += r.spend; e.inbox += r.inbox; e.leads += r.leads; e.impressions += r.impressions;
        } else {
          trendMap.set(r.date, { date: r.date, spend: r.spend, inbox: r.inbox, leads: r.leads, impressions: r.impressions });
        }
      }
      dailyTrend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

      // Ad content: fetch from AdsContentDaily
      const adWhere: any = { pageId };
      if (since && until) adWhere.date = { gte: since, lte: until };
      // allowedPages check already done above (403 if not allowed)

      const adRows = await prisma.adsContentDaily.findMany({
        where: adWhere,
        orderBy: [{ spend: "desc" }],
      });

      // ── Performance by Service: group by adName ─────────────────────────
      const adNameMap = new Map<string, {
        adName: string; campaignName: string; thumbnailUrl: string; mediaType: string;
        spend: number; impressions: number; clicks: number; inbox: number;
        leads: number; likes: number; comments: number; shares: number;
        videoViews: number; adIds: Set<string>;
      }>();

      for (const ad of adRows) {
        const key = ad.adName || ad.adId;
        const e = adNameMap.get(key);
        if (e) {
          e.spend += ad.spend; e.impressions += ad.impressions; e.clicks += ad.clicks;
          e.inbox += ad.inbox; e.leads += ad.leads; e.likes += ad.likes;
          e.comments += ad.comments; e.shares += ad.shares; e.videoViews += ad.videoViews;
          e.adIds.add(ad.adId);
          // Prefer full_picture (s720/p720) over cropped thumbnail (p1080x1080_q75)
          if (ad.thumbnailUrl) {
            const isBetter = !e.thumbnailUrl || (e.thumbnailUrl.includes("c0.5000x0.5000f") && !ad.thumbnailUrl.includes("c0.5000x0.5000f"));
            if (isBetter) e.thumbnailUrl = ad.thumbnailUrl;
          }
          if (!e.mediaType && ad.mediaType) e.mediaType = ad.mediaType;
        } else {
          adNameMap.set(key, {
            adName: ad.adName, campaignName: ad.campaignName,
            thumbnailUrl: ad.thumbnailUrl, mediaType: ad.mediaType,
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks,
            inbox: ad.inbox, leads: ad.leads, likes: ad.likes,
            comments: ad.comments, shares: ad.shares, videoViews: ad.videoViews,
            adIds: new Set([ad.adId]),
          });
        }
      }

      const formatAdRow = (a: any) => ({
        adName: a.adName,
        campaignName: a.campaignName,
        thumbnailUrl: a.thumbnailUrl,
        mediaType: a.mediaType || "",
        spend: a.spend,
        impressions: a.impressions,
        clicks: a.clicks,
        inbox: a.inbox,
        leads: a.leads,
        cpi: a.inbox > 0 ? a.spend / a.inbox : 0,
        cpl: a.leads > 0 ? a.spend / a.leads : 0,
        ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        videoViews: a.videoViews,
        adCount: a.adIds?.size ?? 1,
        convRate: a.inbox > 0 ? (a.leads / a.inbox) * 100 : 0,
      });

      adContent = [...adNameMap.values()].map(formatAdRow).sort((a, b) => b.spend - a.spend);

      // ── Performance by Content: group by perceptualHash > imageHash > URL ──
      // perceptualHash = computed aHash from actual image pixels (most reliable for visual dedup)
      function thumbKey(url: string, hash?: string, phash?: string): string {
        if (phash) return `phash:${phash}`;
        if (hash) return `hash:${hash}`;
        if (url) {
          try { return `url:${new URL(url).pathname}`; } catch { return `url:${url}`; }
        }
        return "";
      }

      // Resolve best thumbnailUrl per adId (prefer non-q75)
      const bestThumb = new Map<string, string>();
      for (const ad of adRows) {
        if (ad.thumbnailUrl) {
          const existing = bestThumb.get(ad.adId);
          const isBetter = !existing || (existing.includes("c0.5000x0.5000f") && !ad.thumbnailUrl.includes("c0.5000x0.5000f"));
          if (isBetter) bestThumb.set(ad.adId, ad.thumbnailUrl);
        }
      }

      // Also resolve best mediaType per adId
      const bestMediaType = new Map<string, string>();
      for (const ad of adRows) {
        if (ad.mediaType && !bestMediaType.has(ad.adId)) {
          bestMediaType.set(ad.adId, ad.mediaType);
        }
      }

      const thumbMap = new Map<string, {
        adNames: Set<string>; campaignName: string; thumbnailUrl: string; mediaType: string;
        spend: number; impressions: number; clicks: number; inbox: number;
        leads: number; likes: number; comments: number; shares: number;
        videoViews: number; adIds: Set<string>;
      }>();

      for (const ad of adRows) {
        const resolvedThumb = bestThumb.get(ad.adId) || "";
        const visualKey = thumbKey(resolvedThumb, ad.imageHash || undefined, ad.perceptualHash || undefined) || `no-thumb-${ad.adId}`;
        const key = `${ad.adName || ''}|${visualKey}`;
        const e = thumbMap.get(key);
        if (e) {
          e.spend += ad.spend; e.impressions += ad.impressions; e.clicks += ad.clicks;
          e.inbox += ad.inbox; e.leads += ad.leads; e.likes += ad.likes;
          e.comments += ad.comments; e.shares += ad.shares; e.videoViews += ad.videoViews;
          e.adNames.add(ad.adName || ad.adId);
          e.adIds.add(ad.adId);
          if (!e.mediaType) e.mediaType = bestMediaType.get(ad.adId) || "";
          // Keep best quality thumbnail URL
          if (resolvedThumb && e.thumbnailUrl.includes("c0.5000x0.5000f") && !resolvedThumb.includes("c0.5000x0.5000f")) {
            e.thumbnailUrl = resolvedThumb;
          }
        } else {
          thumbMap.set(key, {
            adNames: new Set([ad.adName || ad.adId]),
            campaignName: ad.campaignName,
            thumbnailUrl: resolvedThumb,
            mediaType: bestMediaType.get(ad.adId) || ad.mediaType || "",
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks,
            inbox: ad.inbox, leads: ad.leads, likes: ad.likes,
            comments: ad.comments, shares: ad.shares, videoViews: ad.videoViews,
            adIds: new Set([ad.adId]),
          });
        }
      }

      const adByContent = [...thumbMap.values()].map(a => ({
        ...formatAdRow({ ...a, adName: [...a.adNames].join(", ") }),
        adNames: [...a.adNames],
        adCount: a.adIds.size,
      })).sort((a, b) => b.spend - a.spend);

      // Store for response
      responseExtra.adByContent = adByContent;
    }

    // ── Global ad content (when no pageId — for main dashboard) ──────────
    if (!pageId && since && until) {
      const globalAdWhere: any = { date: { gte: since, lte: until } };
      if (effectivePages) {
        globalAdWhere.pageId = { in: effectivePages };
      }
      const globalAdRows = await prisma.adsContentDaily.findMany({
        where: globalAdWhere,
        orderBy: [{ spend: "desc" }],
      });

      // Build pageId → pageName map from adsMetrics + PageNameCache
      const pageNameMap = new Map<string, string>();
      for (const m of adsMetrics) {
        if (m.pageId && m.pageName && m.pageName !== m.pageId && !isInvalidPageName(m.pageName)) {
          pageNameMap.set(m.pageId, m.pageName);
        }
      }
      // Also pull from PageNameCache for any pageIds not in metrics
      const cachedNames = await prisma.pageNameCache.findMany();
      for (const c of cachedNames) {
        if (!pageNameMap.has(c.pageId) && c.pageName && !isInvalidPageName(c.pageName)) {
          pageNameMap.set(c.pageId, c.pageName);
        }
      }

      // Group by adName (service)
      const svcMap = new Map<string, {
        adName: string; thumbnailUrl: string; mediaType: string;
        spend: number; impressions: number; clicks: number; inbox: number;
        leads: number; adIds: Set<string>; pageIds: Set<string>;
        pageMetrics: Map<string, { pageName: string; pageId: string; adAccountId: string; spend: number; inbox: number; leads: number; impressions: number; clicks: number; active: number; paused: number; thumbnailUrl: string }>;
      }>();

      for (const ad of globalAdRows) {
        const key = ad.adName || ad.adId;
        const e = svcMap.get(key);
        const pn = pageNameMap.get(ad.pageId) ?? ad.pageId;
        const isActive = ad.status === "active" ? 1 : 0;
        const isPaused = ad.status === "paused" ? 1 : 0;

        if (e) {
          e.spend += ad.spend; e.impressions += ad.impressions; e.clicks += ad.clicks;
          e.inbox += ad.inbox; e.leads += ad.leads;
          e.adIds.add(ad.adId); e.pageIds.add(ad.pageId);
          // Keep the first thumbnail (data is sorted by spend DESC, so first = highest spend ad)
          if (!e.thumbnailUrl && ad.thumbnailUrl) {
            e.thumbnailUrl = ad.thumbnailUrl;
          }
          if (!e.mediaType && ad.mediaType) e.mediaType = ad.mediaType;

          const pm = e.pageMetrics.get(ad.pageId);
          if (pm) {
            pm.spend += ad.spend; pm.impressions += ad.impressions; pm.clicks += ad.clicks;
            pm.inbox += ad.inbox; pm.leads += ad.leads;
            pm.active += isActive; pm.paused += isPaused;
            // Keep first thumbnail (highest spend ad's thumbnail)
            if (!pm.thumbnailUrl && ad.thumbnailUrl) {
               pm.thumbnailUrl = ad.thumbnailUrl;
            }
          } else {
            e.pageMetrics.set(ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks, inbox: ad.inbox, leads: ad.leads, active: isActive, paused: isPaused, thumbnailUrl: ad.thumbnailUrl || "" });
          }
        } else {
          svcMap.set(key, {
            adName: ad.adName, thumbnailUrl: ad.thumbnailUrl, mediaType: ad.mediaType,
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks,
            inbox: ad.inbox, leads: ad.leads,
            adIds: new Set([ad.adId]), pageIds: new Set([ad.pageId]),
            pageMetrics: new Map([[ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks, inbox: ad.inbox, leads: ad.leads, active: isActive, paused: isPaused, thumbnailUrl: ad.thumbnailUrl || "" }]])
          });
        }
      }

      responseExtra.globalAdContent = [...svcMap.values()]
        .map(a => ({
          adName: a.adName,
          thumbnailUrl: a.thumbnailUrl,
          mediaType: a.mediaType || "",
          spend: a.spend, impressions: a.impressions, clicks: a.clicks,
          inbox: a.inbox, leads: a.leads,
          cpi: a.inbox > 0 ? a.spend / a.inbox : 0,
          cpl: a.leads > 0 ? a.spend / a.leads : 0,
          ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
          adCount: a.adIds.size,
          pageCount: a.pageIds.size,
          convRate: a.inbox > 0 ? (a.leads / a.inbox) * 100 : 0,
          pageBreakdown: [...a.pageMetrics.values()],
        }))
        .sort((a, b) => b.spend - a.spend);
      // Group by unique creative — perceptualHash > imageHash > URL pathname
      const globalThumbKey = (url: string, hash?: string, phash?: string): string => {
        if (phash) return `phash:${phash}`;
        if (hash) return `hash:${hash}`;
        if (url) {
          try { return `url:${new URL(url).pathname}`; } catch { return `url:${url}`; }
        }
        return "";
      };

      // First pass: resolve best thumbnail per adId (prefer non-cropped)
      const globalBestThumb = new Map<string, string>();
      for (const ad of globalAdRows) {
        if (ad.thumbnailUrl) {
          const existing = globalBestThumb.get(ad.adId);
          const isBetter = !existing || (existing.includes("c0.5000x0.5000f") && !ad.thumbnailUrl.includes("c0.5000x0.5000f"));
          if (isBetter) globalBestThumb.set(ad.adId, ad.thumbnailUrl);
        }
      }

      const gThumbMap = new Map<string, {
        adNames: Set<string>; thumbnailUrl: string; mediaType: string;
        spend: number; impressions: number; clicks: number; inbox: number;
        leads: number; adIds: Set<string>; pageIds: Set<string>; pageNamesSet: Set<string>;
        pageMetrics: Map<string, { pageName: string; pageId: string; adAccountId: string; spend: number; inbox: number; leads: number; impressions: number; clicks: number; active: number; paused: number; thumbnailUrl: string }>;
      }>();

      for (const ad of globalAdRows) {
        const resolvedThumb = globalBestThumb.get(ad.adId) || "";
        const visualKey = globalThumbKey(resolvedThumb, ad.imageHash || undefined, ad.perceptualHash || undefined) || `no-thumb-${ad.adId}`;
        const key = `${ad.adName || ''}|${visualKey}`;
        const pn = pageNameMap.get(ad.pageId) ?? ad.pageId;
        const e = gThumbMap.get(key);
        const isActive = ad.status === "active" ? 1 : 0;
        const isPaused = ad.status === "paused" ? 1 : 0;

        if (e) {
          e.spend += ad.spend; e.impressions += ad.impressions; e.clicks += ad.clicks;
          e.inbox += ad.inbox; e.leads += ad.leads;
          e.adNames.add(ad.adName || ad.adId); e.adIds.add(ad.adId); e.pageIds.add(ad.pageId);
          if (!e.mediaType && ad.mediaType) e.mediaType = ad.mediaType;
          // Keep best quality thumbnail URL for this group
          if (resolvedThumb && e.thumbnailUrl.includes("c0.5000x0.5000f") && !resolvedThumb.includes("c0.5000x0.5000f")) {
            e.thumbnailUrl = resolvedThumb;
          }
          e.pageNamesSet.add(pn);
          const pm = e.pageMetrics.get(ad.pageId);
          if (pm) {
            pm.spend += ad.spend; pm.inbox += ad.inbox; pm.leads += ad.leads;
            pm.impressions += ad.impressions; pm.clicks += ad.clicks;
            pm.active += isActive; pm.paused += isPaused;
          } else {
            e.pageMetrics.set(ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, inbox: ad.inbox, leads: ad.leads, impressions: ad.impressions, clicks: ad.clicks, active: isActive, paused: isPaused, thumbnailUrl: resolvedThumb || "" });
          }
        } else {
          gThumbMap.set(key, {
            adNames: new Set([ad.adName || ad.adId]),
            thumbnailUrl: resolvedThumb, mediaType: ad.mediaType,
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks,
            inbox: ad.inbox, leads: ad.leads,
            adIds: new Set([ad.adId]), pageIds: new Set([ad.pageId]),
            pageNamesSet: new Set([pn]),
            pageMetrics: new Map([[ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, inbox: ad.inbox, leads: ad.leads, impressions: ad.impressions, clicks: ad.clicks, active: isActive, paused: isPaused, thumbnailUrl: resolvedThumb || "" }]]),
          });
        }
      }

      responseExtra.globalAdByContent = [...gThumbMap.values()]
        .filter(a => a.thumbnailUrl) // Only include entries with a thumbnail
        .map(a => ({
          adName: [...a.adNames].join(", "),
          adNames: [...a.adNames],
          thumbnailUrl: a.thumbnailUrl,
          mediaType: a.mediaType || "",
          spend: a.spend, impressions: a.impressions, clicks: a.clicks,
          inbox: a.inbox, leads: a.leads,
          cpi: a.inbox > 0 ? a.spend / a.inbox : 0,
          cpl: a.leads > 0 ? a.spend / a.leads : 0,
          ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
          adCount: a.adIds.size,
          pageCount: a.pageIds.size,
          pageNames: [...a.pageNamesSet],
          convRate: a.inbox > 0 ? (a.leads / a.inbox) * 100 : 0,
          pageBreakdown: [...a.pageMetrics.values()]
            .map(p => ({ ...p, cpi: p.inbox > 0 ? p.spend / p.inbox : 0 }))
            .sort((x, y) => y.spend - x.spend),
        }))
        .sort((a, b) => b.spend - a.spend);
    }

    return NextResponse.json(
      {
        adsMetrics,
        count: adsMetrics.length,
        dailyRowCount: rows.length,
        dateRange: { since: since || dataMinDate, until: until || dataMaxDate },
        dataAvailable: { from: dataMinDate, to: dataMaxDate },
        lastSyncedAt,
        ...(dailyTrend ? { dailyTrend } : {}),
        ...(adContent ? { adContent } : {}),
        ...responseExtra,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("❌ ads-data error:", err.message);
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
