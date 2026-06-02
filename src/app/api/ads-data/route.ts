import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

// ── GET /api/ads-data?since=YYYY-MM-DD&until=YYYY-MM-DD&pageId=xxx ───────────
// Queries daily rows from AdsMetricDaily and aggregates per campaign.
// When pageId is provided, also returns dailyTrend + adContent.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const since  = searchParams.get("since") ?? "";
  const until  = searchParams.get("until") ?? "";
  const pageId = searchParams.get("pageId") ?? "";

  try {
    // Build date filter
    const where: any = {};
    if (since && until) {
      where.date = { gte: since, lte: until };
    }
    if (pageId) {
      where.pageId = pageId;
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
    const adsMetrics = [...campaignMap.values()].map(m => ({
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

      // ── Performance by Content: group by image path (same image = 1 row) ──
      // Normalize: extract image pathname to group same images regardless of URL params
      function thumbKey(url: string): string {
        try { return new URL(url).pathname; } catch { return url; }
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
        const key = resolvedThumb ? thumbKey(resolvedThumb) : `no-thumb-${ad.adId}`;
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
      const globalAdRows = await prisma.adsContentDaily.findMany({
        where: { date: { gte: since, lte: until } },
        orderBy: [{ spend: "desc" }],
      });

      // Build pageId → pageName map from adsMetrics
      const pageNameMap = new Map<string, string>();
      for (const m of adsMetrics) {
        if (m.pageId && m.pageName && m.pageName !== m.pageId) {
          pageNameMap.set(m.pageId, m.pageName);
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
          if (ad.thumbnailUrl && (!e.thumbnailUrl || e.thumbnailUrl.includes("c0.5000x0.5000f"))) {
            e.thumbnailUrl = ad.thumbnailUrl;
          }
          if (!e.mediaType && ad.mediaType) e.mediaType = ad.mediaType;

          const pm = e.pageMetrics.get(ad.pageId);
          if (pm) {
            pm.spend += ad.spend; pm.impressions += ad.impressions; pm.clicks += ad.clicks;
            pm.inbox += ad.inbox; pm.leads += ad.leads;
            pm.active += isActive; pm.paused += isPaused;
            if (ad.thumbnailUrl && (!pm.thumbnailUrl || pm.thumbnailUrl.includes("c0.5000x0.5000f"))) {
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

      // Group by content — prefer creativeId (same across pages), fallback to thumbnail filename
      function gThumbKey(url: string): string {
        try {
          const p = new URL(url).pathname;
          const segs = p.split('/').filter(Boolean);
          return `thumb:${segs[segs.length - 1] || p}`;
        } catch { return `thumb:${url}`; }
      }

      // Hamming distance helper for perceptual hash fuzzy matching
      function hammingDist(a: string, b: string): number {
        if (a.length !== b.length) return 999;
        let d = 0;
        for (let i = 0; i < a.length; i++) {
          const diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
          d += diff.toString(2).replace(/0/g, "").length;
        }
        return d;
      }

      const gThumbMap = new Map<string, {
        adNames: Set<string>; thumbnailUrl: string; mediaType: string;
        spend: number; impressions: number; clicks: number; inbox: number;
        leads: number; adIds: Set<string>; pageIds: Set<string>; pageNamesSet: Set<string>;
        pageMetrics: Map<string, { pageName: string; pageId: string; adAccountId: string; spend: number; inbox: number; leads: number; impressions: number; clicks: number; active: number; paused: number }>;
      }>();

      // Fuzzy pHash grouping — canonical list + per-hash cache.
      // Distinct hashes ≪ rows, so this avoids the previous O(rows × keys) scan
      // while preserving identical "first-match-wins" grouping behaviour.
      const phCanonical: string[] = [];           // canonical pHash bodies (without "ph:" prefix)
      const phKeyCache = new Map<string, string>(); // full imageHash ("ph:...") → resolved group key
      function resolvePhKey(fullHash: string): string {
        const cached = phKeyCache.get(fullHash);
        if (cached) return cached;
        const h = fullHash.slice(3); // remove "ph:" prefix
        for (const c of phCanonical) {
          if (hammingDist(h, c) <= 10) {
            const k = `hash:ph:${c}`;
            phKeyCache.set(fullHash, k);
            return k;
          }
        }
        phCanonical.push(h);
        const k = `hash:ph:${h}`;
        phKeyCache.set(fullHash, k);
        return k;
      }

      for (const ad of globalAdRows) {
        // Priority: imageHash (fuzzy pHash) > creativeId > thumbnail filename > adId
        let key: string;
        if (ad.imageHash) {
          if (ad.imageHash.startsWith("ph:")) {
            key = resolvePhKey(ad.imageHash);
          } else {
            key = `hash:${ad.imageHash}`;
          }
        } else if (ad.creativeId) {
          key = `crt:${ad.creativeId}`;
        } else if (ad.thumbnailUrl) {
          key = gThumbKey(ad.thumbnailUrl);
        } else {
          key = `no-thumb-${ad.adId}`;
        }
        const pn = pageNameMap.get(ad.pageId) ?? ad.pageId;
        const e = gThumbMap.get(key);
        const isActive = ad.status === "active" ? 1 : 0;
        const isPaused = ad.status === "paused" ? 1 : 0;

        if (e) {
          e.spend += ad.spend; e.impressions += ad.impressions; e.clicks += ad.clicks;
          e.inbox += ad.inbox; e.leads += ad.leads;
          e.adNames.add(ad.adName || ad.adId); e.adIds.add(ad.adId); e.pageIds.add(ad.pageId);
          if (!e.mediaType && ad.mediaType) e.mediaType = ad.mediaType;
          e.pageNamesSet.add(pn);
          // Per-page accumulation
          const pm = e.pageMetrics.get(ad.pageId);
          if (pm) { 
            pm.spend += ad.spend; pm.inbox += ad.inbox; pm.leads += ad.leads; 
            pm.impressions += ad.impressions; pm.clicks += ad.clicks;
            pm.active += isActive; pm.paused += isPaused;
          }
          else { e.pageMetrics.set(ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, inbox: ad.inbox, leads: ad.leads, impressions: ad.impressions, clicks: ad.clicks, active: isActive, paused: isPaused }); }
        } else {
          gThumbMap.set(key, {
            adNames: new Set([ad.adName || ad.adId]),
            thumbnailUrl: ad.thumbnailUrl, mediaType: ad.mediaType,
            spend: ad.spend, impressions: ad.impressions, clicks: ad.clicks,
            inbox: ad.inbox, leads: ad.leads,
            adIds: new Set([ad.adId]), pageIds: new Set([ad.pageId]),
            pageNamesSet: new Set([pn]),
            pageMetrics: new Map([[ad.pageId, { pageName: pn, pageId: ad.pageId, adAccountId: ad.adAccountId, spend: ad.spend, inbox: ad.inbox, leads: ad.leads, impressions: ad.impressions, clicks: ad.clicks, active: isActive, paused: isPaused }]]),
          });
        }
      }

      responseExtra.globalAdByContent = [...gThumbMap.values()]
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
