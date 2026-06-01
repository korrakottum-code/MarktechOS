"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Suspense, Fragment } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdsMetric } from "@/lib/app-data-types";
import {
  DollarSign, Users, MessageCircle, Target,
  Activity, Search, RefreshCw, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Zap, AlertCircle, Calendar,
  Image, Filter, X, ZoomIn, Play, Trophy, TrendingDown, MousePointerClick, Award, BarChart3, ArrowRight, Eye, MessageSquare
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ── Lightweight data hook with auto-refresh ──────────────────────────────────
interface AdsDataMeta {
  dailyRowCount: number;
  dataAvailable: { from: string; to: string };
  lastSyncedAt: string | null;
}

const AUTO_REFRESH_MS = 5 * 60 * 1000;  // 5 minutes
const STALE_THRESHOLD_MS = 60 * 60 * 1000;  // 1 hour

interface GlobalAdItem {
  adName: string; thumbnailUrl: string; mediaType: string;
  spend: number; impressions: number; clicks: number; inbox: number;
  leads: number; cpi: number; cpl: number; ctr: number;
  adCount: number; pageCount: number; convRate: number;
  adNames?: string[]; pageNames?: string[];
  pageBreakdown?: { pageName: string; spend: number; inbox: number; leads: number; cpi: number }[];
}

interface AdsDataPayload {
  metrics: AdsMetric[];
  meta: AdsDataMeta;
  globalAdContent: GlobalAdItem[];
  globalAdByContent: GlobalAdItem[];
}

// Module-level cache keyed by `since|until` so switching back to a previously
// loaded range (e.g. date presets) renders instantly without a refetch.
// Sync / manual refresh force a fresh fetch and overwrite the cache.
const adsDataCache = new Map<string, AdsDataPayload>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const adsDataCacheTime = new Map<string, number>();

function useAdsData(since: string, until: string) {
  const [metrics, setMetrics] = useState<AdsMetric[]>([]);
  const [meta, setMeta] = useState<AdsDataMeta | null>(null);
  const [globalAdContent, setGlobalAdContent] = useState<GlobalAdItem[]>([]);
  const [globalAdByContent, setGlobalAdByContent] = useState<GlobalAdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((p: AdsDataPayload) => {
    setMetrics(p.metrics);
    setGlobalAdContent(p.globalAdContent);
    setGlobalAdByContent(p.globalAdByContent);
    setMeta(p.meta);
    setError(null);
  }, []);

  const load = useCallback(async (s: string, u: string, opts: { silent?: boolean; force?: boolean } = {}) => {
    const { silent = false, force = false } = opts;
    const key = `${s}|${u}`;

    // Serve from cache when fresh (skipped on force = sync/manual refresh)
    if (!force) {
      const cached = adsDataCache.get(key);
      const ts = adsDataCacheTime.get(key) ?? 0;
      if (cached && Date.now() - ts < CACHE_TTL_MS) {
        applyPayload(cached);
        setLoading(false);
        return;
      }
    }

    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/ads-data?since=${s}&until=${u}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const payload: AdsDataPayload = {
        metrics: json.adsMetrics ?? [],
        globalAdContent: json.globalAdContent ?? [],
        globalAdByContent: json.globalAdByContent ?? [],
        meta: {
          dailyRowCount: json.dailyRowCount ?? 0,
          dataAvailable: json.dataAvailable ?? { from: '', to: '' },
          lastSyncedAt: json.lastSyncedAt ?? null,
        },
      };
      adsDataCache.set(key, payload);
      adsDataCacheTime.set(key, Date.now());
      applyPayload(payload);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => { load(since, until); }, [since, until, load]);

  useEffect(() => {
    const interval = setInterval(() => load(since, until, { silent: true, force: true }), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [since, until, load]);

  const reload = useCallback(() => load(since, until, { force: true }), [load, since, until]);

  const isStale = useMemo(() => {
    if (!meta?.lastSyncedAt) return true;
    return Date.now() - new Date(meta.lastSyncedAt).getTime() > STALE_THRESHOLD_MS;
  }, [meta?.lastSyncedAt]);

  return { metrics, meta, globalAdContent, globalAdByContent, loading, error, reload, isStale };
}

// ─── Format helpers ────────────────────────────────────────────────────────────
function thb(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}
function num(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("th-TH");
}
function pct(n: number) { return `${n.toFixed(1)}%`; }

// ─── Per-page aggregation ─────────────────────────────────────────────────────
interface PageRow {
  pageName:       string;
  pageId:         string;
  adAccountId:    string;
  spend:          number;
  inbox:          number;
  cpi:            number;
  leads:          number;
  cpl:            number;
  leadInboxRatio: number;
  activeCnt:      number;
  pausedCnt:      number;
  totalCampaigns: number;
}

function groupByPage(metrics: AdsMetric[]): PageRow[] {
  const map = new Map<string, {
    pageId: string; adAccountId: string;
    spend: number; inbox: number; leads: number;
    active: number; paused: number; count: number;
  }>();

  for (const m of metrics) {
    const key = m.pageName || m.clinic;
    const e   = map.get(key) ?? { pageId: "", adAccountId: "", spend: 0, inbox: 0, leads: 0, active: 0, paused: 0, count: 0 };
    map.set(key, {
      pageId:      m.pageId      || e.pageId,
      adAccountId: m.adAccountId || e.adAccountId,
      spend:  e.spend  + m.spend,
      inbox:  e.inbox  + m.inbox,
      leads:  e.leads  + m.leads,
      active: e.active + (m.status === "active" ? 1 : 0),
      paused: e.paused + (m.status === "paused" ? 1 : 0),
      count:  e.count  + 1,
    });
  }

  return [...map.entries()].map(([pageName, d]) => ({
    pageName,
    pageId:         d.pageId,
    adAccountId:    d.adAccountId,
    spend:          d.spend,
    inbox:          d.inbox,
    cpi:            d.inbox > 0 ? d.spend / d.inbox : 0,
    leads:          d.leads,
    cpl:            d.leads > 0 ? d.spend / d.leads : 0,
    leadInboxRatio: d.inbox > 0 ? (d.leads / d.inbox) * 100 : 0,
    activeCnt:      d.active,
    pausedCnt:      d.paused,
    totalCampaigns: d.count,
  }));
}

type SortKey = keyof Pick<PageRow, "spend" | "inbox" | "cpi" | "leads" | "cpl" | "leadInboxRatio">;
type SortDir = "asc" | "desc";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ p }: { p: PageRow }) {
  if (p.activeCnt > 0 && p.pausedCnt === 0)
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>;
  if (p.activeCnt > 0)
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold whitespace-nowrap">{p.activeCnt}A · {p.pausedCnt}P</span>;
  if (p.pausedCnt > 0)
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Paused</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 font-bold">Ended</span>;
}
// ─── Relative time helper ────────────────────────────────────────────────────
function timeAgo(iso: string | null): string {
  if (!iso) return "ยังไม่ได้ sync";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม. ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FacebookAdsDashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="text-foreground-muted">Loading...</div></div>}>
      <FacebookAdsDashboard />
    </Suspense>
  );
}

function FacebookAdsDashboard() {
  const searchParams = useSearchParams();
  // Date range state — default to yesterday, restore from URL if navigating back
  const today = toISO(new Date());
  const [since, setSince] = useState(() => searchParams.get("since") || today);
  const [until, setUntil] = useState(() => searchParams.get("until") || today);

  const { metrics: raw, meta, globalAdContent: _globalAdContent, globalAdByContent: _globalAdByContent, loading, error, reload, isStale } = useAdsData(since, until);

  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Apply search filter to global content ────────────────────────────────────
  const globalAdContent = useMemo(() => {
    if (!search) return _globalAdContent;
    return _globalAdContent.map(svc => {
      if (!svc.pageBreakdown) return svc;
      const filteredPB = svc.pageBreakdown.filter((pb: any) => 
        pb.pageName.toLowerCase().includes(search.toLowerCase()) || (pb.adAccountId || "").includes(search)
      );
      if (filteredPB.length === 0) return null;
      return {
        ...svc,
        pageBreakdown: filteredPB,
        spend: filteredPB.reduce((s: number, p: any) => s + p.spend, 0),
        inbox: filteredPB.reduce((s: number, p: any) => s + p.inbox, 0),
        leads: filteredPB.reduce((s: number, p: any) => s + p.leads, 0),
        impressions: filteredPB.reduce((s: number, p: any) => s + p.impressions, 0),
        clicks: filteredPB.reduce((s: number, p: any) => s + p.clicks, 0),
        cpi: filteredPB.reduce((s: number, p: any) => s + p.inbox, 0) > 0 ? filteredPB.reduce((s: number, p: any) => s + p.spend, 0) / filteredPB.reduce((s: number, p: any) => s + p.inbox, 0) : 0,
        pageCount: filteredPB.length
      };
    }).filter(Boolean) as GlobalAdItem[];
  }, [_globalAdContent, search]);

  const globalAdByContent = useMemo(() => {
    if (!search) return _globalAdByContent;
    return _globalAdByContent.map(svc => {
      if (!svc.pageBreakdown) return svc;
      const filteredPB = svc.pageBreakdown.filter((pb: any) => 
        pb.pageName.toLowerCase().includes(search.toLowerCase()) || (pb.adAccountId || "").includes(search)
      );
      if (filteredPB.length === 0) return null;
      return {
        ...svc,
        pageBreakdown: filteredPB,
        spend: filteredPB.reduce((s: number, p: any) => s + p.spend, 0),
        inbox: filteredPB.reduce((s: number, p: any) => s + p.inbox, 0),
        leads: filteredPB.reduce((s: number, p: any) => s + p.leads, 0),
        impressions: filteredPB.reduce((s: number, p: any) => s + (p.impressions || 0), 0),
        clicks: filteredPB.reduce((s: number, p: any) => s + (p.clicks || 0), 0),
        cpi: filteredPB.reduce((s: number, p: any) => s + p.inbox, 0) > 0 ? filteredPB.reduce((s: number, p: any) => s + p.spend, 0) / filteredPB.reduce((s: number, p: any) => s + p.inbox, 0) : 0,
        pageCount: filteredPB.length
      };
    }).filter(Boolean) as GlobalAdItem[];
  }, [_globalAdByContent, search]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showExtraCols, setShowExtraCols] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ url: string; name: string; spend: number; inbox: number; cpi: number; mediaType?: string; pageNames?: string[] } | null>(null);
  const [view, setView] = useState<'overview' | 'pages' | 'service' | 'content'>('overview');
  const [svcSort, setSvcSort] = useState<{ key: keyof GlobalAdItem; dir: 'asc' | 'desc' }>({ key: 'spend', dir: 'desc' });

  // ── Unique service names for cross filter ────────────────────────────────
  const serviceNames = useMemo(() => {
    const names = [...new Set(globalAdContent.map(a => a.adName))].filter(Boolean);
    return names.sort((a, b) => {
      const sa = globalAdContent.find(c => c.adName === a)?.spend ?? 0;
      const sb = globalAdContent.find(c => c.adName === b)?.spend ?? 0;
      return sb - sa;
    });
  }, [globalAdContent]);

  // ── Group content by service → top 3 each ───────────────────────────────
  const contentByService = useMemo(() => {
    const groups = new Map<string, GlobalAdItem[]>();
    for (const item of globalAdByContent) {
      const names = item.adNames ?? [item.adName];
      for (const name of names) {
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(item);
      }
    }
    // Sort each group by svcSort
    for (const [, items] of groups) {
      items.sort((a, b) => {
        const av = (a[svcSort.key] as number) ?? 0;
        const bv = (b[svcSort.key] as number) ?? 0;
        return svcSort.dir === 'desc' ? bv - av : av - bv;
      });
    }
    return groups;
  }, [globalAdByContent, svcSort]);

  // ── Aggregate & filter ───────────────────────────────────────────────────────
  const pages = useMemo(() => {
    let basePages: PageRow[] = [];
    if (serviceFilter) {
      const svc = globalAdContent.find(s => s.adName === serviceFilter);
      if (svc && svc.pageBreakdown) {
        basePages = svc.pageBreakdown.map((pb: any) => ({
          pageName: pb.pageName,
          pageId: pb.pageId,
          adAccountId: pb.adAccountId,
          spend: pb.spend,
          inbox: pb.inbox,
          leads: pb.leads,
          cpi: pb.inbox > 0 ? pb.spend / pb.inbox : 0,
          cpl: pb.leads > 0 ? pb.spend / pb.leads : 0,
          leadInboxRatio: pb.inbox > 0 ? (pb.leads / pb.inbox) * 100 : 0,
          activeCnt: pb.active || 0,
          pausedCnt: pb.paused || 0,
          totalCampaigns: (pb.active || 0) + (pb.paused || 0),
          impressions: pb.impressions || 0,
          clicks: pb.clicks || 0
        } as PageRow));
      }
    } else {
      basePages = groupByPage(raw);
      basePages = basePages.filter(p => search === "" || p.pageName.toLowerCase().includes(search.toLowerCase()) || p.adAccountId.includes(search));
    }
    return basePages.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [raw, globalAdContent, search, serviceFilter, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const totalSpend = pages.reduce((s, p) => s + p.spend, 0);
    const totalInbox = pages.reduce((s, p) => s + p.inbox, 0);
    const totalLeads = pages.reduce((s, p) => s + p.leads, 0);
    
    let totalImpressions = 0;
    let totalClicks = 0;
    let active = 0;
    
    if (serviceFilter) {
      totalImpressions = pages.reduce((s, p) => s + ((p as any).impressions || 0), 0);
      totalClicks = pages.reduce((s, p) => s + ((p as any).clicks || 0), 0);
      active = pages.reduce((s, p) => s + p.activeCnt, 0);
    } else {
      const filteredRaw = raw.filter(m => search === "" || (m.pageName || m.clinic || "").toLowerCase().includes(search.toLowerCase()) || (m.adAccountId || "").includes(search));
      totalImpressions = filteredRaw.reduce((s, m) => s + m.impressions, 0);
      totalClicks = filteredRaw.reduce((s, m) => s + m.clicks, 0);
      active = filteredRaw.filter(m => m.status === "active").length;
    }

    return {
      totalSpend,
      totalInbox,
      totalLeads,
      totalImpressions,
      totalClicks,
      avgCPI:  totalInbox > 0 ? totalSpend / totalInbox : 0,
      avgCPL:  totalLeads > 0 ? totalSpend / totalLeads : 0,
      ratio:   totalInbox > 0 ? (totalLeads / totalInbox) * 100 : 0,
      ctr:     totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      active,
    };
  }, [pages, raw, search, serviceFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  // ── Sync handler (fire + poll for completion) ─────────────────────────────
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncMsg("🔄 Syncing จาก Meta API...");

    // Capture the current lastSyncedAt before sync
    const beforeSync = meta?.lastSyncedAt ?? null;
    let done = false;

    const finish = (msg: string) => {
      if (done) return;
      done = true;
      if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; }
      setSyncMsg(msg);
      setSyncing(false);
      syncingRef.current = false;
      reload();
      setTimeout(() => setSyncMsg(null), 8000);
    };

    // Fire the sync request (don't await — proxy may drop long connections)
    fetch(`/api/cron/sync-ads?since=${since}&until=${until}`)
      .then(async (res) => {
        if (done) return;
        try {
          const json = await res.json();
          if (!res.ok || json.error) {
            finish(`⚠️ ${json.error || "Sync failed"}`);
          } else {
            finish(`✅ ${json.message ?? "Sync complete"}`);
          }
        } catch {
          // Response wasn't JSON — polling will handle it
        }
      })
      .catch(() => {
        // Network error / proxy timeout — polling will detect completion
      });

    // Poll /api/app-data every 5s to detect when lastSyncedAt changes
    let pollCount = 0;
    syncIntervalRef.current = setInterval(async () => {
      if (done) { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); return; }
      pollCount++;
      try {
        const res = await fetch("/api/app-data");
        const data = await res.json();
        const newSyncedAt = data?.meta?.lastSyncedAt ?? null;

        if (newSyncedAt && newSyncedAt !== beforeSync) {
          finish("✅ Sync เสร็จแล้ว");
          return;
        }
      } catch { /* keep trying */ }

      if (!done) setSyncMsg(`🔄 Syncing... (${pollCount * 5}s)`);

      if (pollCount >= 36) {
        if (done) return;
        done = true;
        if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; }
        setSyncMsg("⏱ Sync นานเกิน 3 นาที — ลอง refresh");
        setSyncing(false);
        syncingRef.current = false;
        setTimeout(() => setSyncMsg(null), 10000);
      }
    }, 5000);

  }, [since, until, reload, meta?.lastSyncedAt]);

  // ── Stale data: show banner instead of auto-syncing ─────────────────────────
  // (auto-sync removed — the heavy Meta API sync should be user-initiated)
  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-2 border-gold-500/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-foreground-muted animate-pulse">กำลังโหลดข้อมูล...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pt-4 sm:pt-6 max-w-7xl mx-auto pb-12">
      {/* ── Header & Date Filters ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{kpis.active} Active campaigns</span>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${
              isStale
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {syncing ? '🔄 Syncing...' : `⏱ ${timeAgo(meta?.lastSyncedAt ?? null)}`}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Facebook Ads Dashboard
          </h1>
          <p className="text-foreground-muted text-sm">{pages.length} เพจ · {raw.length} campaigns</p>
        </div>

        {/* Filters Group (Floating Island style) */}
        <div className="flex flex-wrap items-center gap-2 bg-navy-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-950/50 rounded-xl">
            <Calendar size={14} className="text-gold-400 shrink-0" />
            <input
              type="date" value={since} onChange={e => {
                const val = e.target.value;
                setSince(val);
                const params = new URLSearchParams(searchParams.toString());
                params.set("since", val);
                params.set("until", until);
                window.history.pushState(null, "", `/?${params.toString()}`);
              }}
              disabled={syncing}
              className={`bg-transparent text-xs font-medium text-foreground focus:outline-none w-28 ${syncing ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
            <span className="text-foreground-muted text-xs">→</span>
            <input
              type="date" value={until} onChange={e => {
                const val = e.target.value;
                setUntil(val);
                const params = new URLSearchParams(searchParams.toString());
                params.set("since", since);
                params.set("until", val);
                window.history.pushState(null, "", `/?${params.toString()}`);
              }}
              disabled={syncing}
              className={`bg-transparent text-xs font-medium text-foreground focus:outline-none w-28 ${syncing ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

          <div className="flex gap-1 hidden md:flex">
            {[
              { label: "วันนี้",     s: toISO(new Date()), u: toISO(new Date()) },
              { label: "เมื่อวาน",   s: toISO(new Date(Date.now() - 864e5)), u: toISO(new Date(Date.now() - 864e5)) },
              { label: "7 วัน",      s: toISO(new Date(Date.now() - 6*864e5)), u: toISO(new Date()) },
              { label: "14 วัน",     s: toISO(new Date(Date.now() - 13*864e5)), u: toISO(new Date()) },
              { label: "เดือนนี้",   s: toISO(firstOfMonth()), u: toISO(new Date()) },
              { label: "เดือนที่แล้ว", s: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth()-1, 1)); })(), u: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth(), 0)); })() },
            ].map(p => (
              <button key={p.label} disabled={syncing} onClick={() => {
                setSince(p.s);
                setUntil(p.u);
                const params = new URLSearchParams(searchParams.toString());
                params.set("since", p.s);
                params.set("until", p.u);
                window.history.pushState(null, "", `/?${params.toString()}`);
              }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  since === p.s && until === p.u
                    ? "bg-gold-500/20 text-gold-400"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-1.5 bg-gold-500 text-navy-950 rounded-xl text-sm font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-60 ml-1">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-lg animate-fade-in ${
          syncMsg.startsWith("⚠️") || syncMsg.startsWith("❌") || syncMsg.startsWith("⏱")
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
            : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
        }`}>
          {syncMsg}
        </div>
      )}

      {/* Stale data banner */}
      {isStale && !syncing && !syncMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-fade-in shadow-lg">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400 flex-1 font-medium">
            ข้อมูลเก่ากว่า 1 ชม. ({timeAgo(meta?.lastSyncedAt ?? null)}) — กด Sync เพื่ออัปเดตจาก Meta
          </p>
          <button onClick={handleSync}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition-colors">
            <RefreshCw size={12} />
            Sync ตอนนี้
          </button>
        </div>
      )}

      {/* ── KPI Grid (Modern Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: "Spent",  value: thb(kpis.totalSpend), icon: DollarSign,  color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/20", glow: "from-rose-500/20" },
          { label: "Inbox",  value: num(kpis.totalInbox), icon: MessageCircle,color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20", glow: "from-blue-500/20" },
          { label: "Avg CPI",value: thb(kpis.avgCPI),     icon: Target,      color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20", glow: "from-cyan-500/20" },
          { label: "Lead",   value: num(kpis.totalLeads), icon: Users,       color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "from-purple-500/20" },
          { label: "Avg CPL",value: thb(kpis.avgCPL),     icon: Target,      color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", glow: "from-orange-500/20" },
          { label: "% L/I",  value: pct(kpis.ratio),      icon: Activity,    color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20", glow: "from-emerald-500/20" },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="relative overflow-hidden rounded-3xl bg-navy-900 border border-white/5 p-4 sm:p-5 shadow-xl flex flex-col gap-3 group hover:border-white/10 transition-colors animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Subtle background glow */}
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${k.glow} to-transparent opacity-50 blur-2xl group-hover:scale-150 group-hover:opacity-70 transition-all duration-500`} />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${k.bg} ${k.border}`}>
                  <Icon size={18} className={k.color} />
                </div>
                <span className="text-sm font-semibold text-foreground-muted">{k.label}</span>
              </div>
              <div className="relative z-10 pt-1">
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${k.color}`}>{k.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content Area (Tabs + Tables) ── */}
      <div className="bg-navy-900/80 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl animate-fade-in" style={{ animationDelay: '300ms' }}>
        
        {/* Header Control Bar */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-navy-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Segmented Control Tabs */}
          <div className="flex p-1 bg-navy-950/80 rounded-2xl border border-white/5 self-start shadow-inner overflow-x-auto scrollbar-hide">
            {([
              ['overview', 'Overview Dashboard'],
              ['pages',   `รายเพจ (${pages.length})`],
              ['service', `Service (${serviceNames.length})`],
              ['content', `Content (${globalAdByContent.length})`],
            ] as [typeof view, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  view === key
                    ? "bg-gold-500 text-navy-950 shadow-md"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative shrink-0 w-full sm:w-auto">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted/60" />
            <input type="text" placeholder="ค้นหาเพจ, บริการ..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-navy-950/50 border border-white/5 rounded-2xl text-xs text-foreground placeholder:text-foreground-muted/40 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all shadow-inner" />
          </div>
        </div>

        {/* Sub-filters (Service pills for non-page views) */}
        {view !== 'pages' && serviceNames.length > 0 && (
          <div className="px-5 py-3 border-b border-white/5 bg-navy-900/30 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Filter size={14} className="text-purple-400 shrink-0 mr-1" />
            <button onClick={() => setServiceFilter(null)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                !serviceFilter
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-navy-950/50 border-white/5 text-foreground-muted hover:text-foreground hover:bg-white/10"
              }`}>
              ทั้งหมด
            </button>
            <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
            {serviceNames.map(name => {
              const svc = globalAdContent.find(a => a.adName === name);
              return (
                <button key={name}
                  onClick={() => setServiceFilter(serviceFilter === name ? null : name)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                    serviceFilter === name
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "bg-navy-950/50 border-white/5 text-foreground-muted hover:text-foreground hover:bg-white/10"
                  }`}>
                  {name}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${serviceFilter === name ? "bg-purple-500/20" : "bg-white/5"}`}>
                    {thb(svc?.spend ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      {/* ── Infographic Overview Dashboard ── */}
      {view === 'overview' && (
        <div className="space-y-6">
          
          {/* Header Title Banner */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                <BarChart3 size={12} /> Executive Summary
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">ผลการดำเนินงานภาพรวม</h2>
              <p className="text-foreground-muted text-sm mt-1">{pages.length} คลินิกที่ดูแล • ข้อมูล ณ {since} ถึง {until}</p>
            </div>
            
            {/* Quick Stats in Banner */}
            <div className="relative z-10 flex gap-4 bg-navy-950/50 p-2 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="px-6 py-2 border-r border-white/10">
                <p className="text-[10px] text-white/50 font-bold uppercase text-center mb-1">ยอดใช้จ่ายรวม (Spent)</p>
                <p className="text-xl font-black text-rose-400 text-center">{thb(kpis.totalSpend)}</p>
              </div>
              <div className="px-6 py-2">
                <p className="text-[10px] text-white/50 font-bold uppercase text-center mb-1">ยอด Leads รวม</p>
                <p className="text-xl font-black text-emerald-400 text-center">{num(kpis.totalLeads)} <span className="text-xs font-medium">คน</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Metrics & Funnel (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Infographic KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: "ต้นทุนต่อแชท (CPI)", value: thb(kpis.avgCPI), icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
                  { title: "ต้นทุนต่อลีด (CPL)", value: thb(kpis.avgCPL), icon: Users, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
                  { title: "การเข้าถึง (Imp.)", value: num(kpis.totalImpressions), icon: Eye, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
                  { title: "จำนวนแชท (Inbox)", value: num(kpis.totalInbox), icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-2xl bg-navy-900 border ${stat.border} p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg`}>
                    <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${stat.bg} blur-xl`} />
                    <stat.icon size={20} className={`${stat.color} mb-2 relative z-10`} />
                    <p className={`text-xl font-black tracking-tight ${stat.color} relative z-10`}>{stat.value}</p>
                    <p className="text-[10px] font-bold text-white/60 uppercase mt-1 relative z-10">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Conversion Funnel Box */}
              <div className="bg-navy-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-navy-950/50 border-b border-white/5 p-4 flex items-center justify-center gap-2">
                  <Filter size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">ประสิทธิภาพแต่ละขั้นตอน (Funnel)</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col gap-3 relative">
                    <div className="absolute left-[38px] top-4 bottom-4 w-1 bg-white/5 rounded-full" />
                    {[
                      { step: 1, label: "เห็นโฆษณา (Impressions)", value: num(kpis.totalImpressions), drop: null, color: "text-sky-400", bg: "bg-sky-500" },
                      { step: 2, label: "คลิกโฆษณา (Clicks)", value: num(kpis.totalClicks), drop: kpis.totalImpressions ? pct(kpis.totalClicks/kpis.totalImpressions*100) : "0%", color: "text-blue-400", bg: "bg-blue-500" },
                      { step: 3, label: "ทักแชท (Inbox)", value: num(kpis.totalInbox), drop: kpis.totalClicks ? pct(kpis.totalInbox/kpis.totalClicks*100) : "0%", color: "text-purple-400", bg: "bg-purple-500" },
                      { step: 4, label: "เป็นลูกค้า (Leads)", value: num(kpis.totalLeads), drop: kpis.totalInbox ? pct(kpis.totalLeads/kpis.totalInbox*100) : "0%", color: "text-emerald-400", bg: "bg-emerald-500" },
                    ].map(s => (
                      <div key={s.step} className="flex items-center gap-4 relative z-10">
                        <div className={`w-20 h-20 rounded-2xl bg-navy-950 border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-lg`}>
                          <span className="text-[10px] font-bold text-white/40 mb-1">STEP</span>
                          <span className={`text-2xl font-black ${s.color}`}>{s.step}</span>
                        </div>
                        <div className="flex-1 bg-gradient-to-r from-navy-950 to-navy-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/20 transition-colors">
                          <div>
                            <p className="text-xs font-bold text-white/70 mb-1">{s.label}</p>
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                          </div>
                          {s.drop && (
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-white/40 uppercase mb-1">อัตราไปต่อ</p>
                              <div className={`px-3 py-1 rounded-lg ${s.bg}/20 border border-${s.bg}/30 text-white font-black text-sm`}>
                                {s.drop}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Top Services & Comparison (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Versus Block (Best vs Worst CPI) */}
              <div className="bg-navy-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-navy-950/50 border-b border-white/5 p-4 flex items-center justify-center gap-2">
                  <Activity size={16} className="text-gold-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Top vs Bottom Services (CPI)</h3>
                </div>
                
                <div className="p-6 relative">
                  <div className="absolute left-1/2 top-10 bottom-10 w-px bg-white/10 -translate-x-1/2" />
                  <div className="absolute left-1/2 top-1/2 w-10 h-10 bg-navy-950 border-2 border-white/10 rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 text-white font-black italic shadow-xl z-10">VS</div>
                  
                  {(() => {
                    const validSvcs = [...globalAdContent].filter(s => s.inbox > 5 && s.spend > 1000).sort((a,b) => a.cpi - b.cpi);
                    const best = validSvcs[0] || globalAdContent[0];
                    const worst = validSvcs[validSvcs.length - 1] || globalAdContent[globalAdContent.length - 1];
                    
                    if (!best || !worst) return <div className="text-center text-white/50 text-sm py-8">ไม่มีข้อมูลพอเปรียบเทียบ</div>;

                    return (
                      <div className="flex justify-between items-center gap-8">
                        {/* Best */}
                        <div className="flex-1 text-center">
                          <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg mb-4 border border-emerald-500/30">ถูกที่สุด</div>
                          <div className="w-16 h-16 mx-auto bg-navy-950 rounded-2xl border border-emerald-500/30 flex items-center justify-center mb-3">
                            <Image size={24} className="text-emerald-400" />
                          </div>
                          <p className="text-xs font-bold text-white truncate max-w-[120px] mx-auto mb-2" title={best.adName}>{best.adName}</p>
                          <p className="text-2xl font-black text-emerald-400">{thb(best.cpi)}</p>
                          <p className="text-[9px] text-white/50 uppercase mt-1">/ Inbox</p>
                        </div>
                        
                        {/* Worst */}
                        <div className="flex-1 text-center">
                          <div className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg mb-4 border border-rose-500/30">แพงที่สุด</div>
                          <div className="w-16 h-16 mx-auto bg-navy-950 rounded-2xl border border-rose-500/30 flex items-center justify-center mb-3">
                            <Image size={24} className="text-rose-400" />
                          </div>
                          <p className="text-xs font-bold text-white truncate max-w-[120px] mx-auto mb-2" title={worst.adName}>{worst.adName}</p>
                          <p className="text-2xl font-black text-rose-400">{thb(worst.cpi)}</p>
                          <p className="text-[9px] text-white/50 uppercase mt-1">/ Inbox</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Top 3 Services Leaderboard */}
              <div className="bg-navy-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-navy-950/50 border-b border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-gold-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">3 อันดับบริการยอดฮิต</h3>
                  </div>
                  <button onClick={() => setView('service')} className="text-[10px] text-gold-400 hover:underline">ดูทั้งหมด</button>
                </div>
                <div className="p-5 space-y-4">
                  {[...globalAdContent].sort((a,b) => b.leads - a.leads).slice(0, 3).map((svc, i) => {
                    const colors = [
                      "from-gold-500 to-amber-600 text-gold-400 bg-gold-500/10 border-gold-500/30",
                      "from-slate-300 to-slate-400 text-slate-300 bg-slate-500/10 border-slate-500/30",
                      "from-amber-700 to-amber-800 text-amber-600 bg-amber-700/10 border-amber-700/30"
                    ];
                    const [grad, textC, bg, border] = colors[i].split(" ");
                    return (
                      <div key={svc.adName} className={`flex items-center gap-4 p-3 rounded-2xl border ${border} ${bg}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-navy-950 font-black text-sm shadow-lg`}>
                          {i+1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{svc.adName}</p>
                          <p className="text-[10px] text-white/60">Spend: {thb(svc.spend)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${textC}`}>{svc.leads}</p>
                          <p className="text-[9px] text-white/50 uppercase font-bold">Leads</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Winning Creatives Gallery */}
          <div className="bg-navy-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-navy-950/50 border-b border-white/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-rose-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">🏆 Winning Creatives (Top 4)</h3>
              </div>
              <button onClick={() => setView('content')} className="text-[10px] font-bold text-gold-400 border border-gold-500/30 px-3 py-1 rounded-lg hover:bg-gold-500/10 transition-colors">
                ดูโฆษณาทั้งหมด
              </button>
            </div>

            <div className="p-5 sm:p-6 bg-gradient-to-b from-navy-900 to-navy-950/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...globalAdByContent]
                  .filter(ad => ad.thumbnailUrl)
                  .sort((a,b) => b.leads - a.leads)
                  .slice(0, 4)
                  .map((ad, i) => (
                  <div key={ad.adName+i} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[3/4] flex flex-col justify-end shadow-2xl">
                    <img src={ad.thumbnailUrl} alt={ad.adName} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-110 group-hover:opacity-90 transition-all duration-700" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-lg border border-white/20">
                      RANK #{i+1}
                    </div>

                    <div className="relative z-10 p-4 w-full">
                      <p className="text-xs font-bold text-white mb-3 line-clamp-2 leading-snug drop-shadow-md">{ad.adName}</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 backdrop-blur-md rounded-xl p-2.5 border border-white/10 text-center">
                          <p className="text-[9px] text-white/50 font-bold uppercase mb-0.5">Leads</p>
                          <p className="text-base font-black text-emerald-400">{ad.leads}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-md rounded-xl p-2.5 border border-white/10 text-center">
                          <p className="text-[9px] text-white/50 font-bold uppercase mb-0.5">CPL</p>
                          <p className="text-base font-black text-orange-400">{thb(ad.cpl)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Page Table ── */}
      {view === 'pages' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-950/40">
              <tr className="border-b border-white/10">
                <th className="px-3 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider min-w-[200px] max-w-[260px]">
                  <div className="flex items-center gap-1">
                    ชื่อเพจ
                    <button onClick={() => setShowExtraCols(!showExtraCols)}
                      className="ml-1 p-0.5 rounded hover:bg-navy-700 text-foreground-muted/50 hover:text-gold-400 transition-colors"
                      title={showExtraCols ? 'ซ่อน Account ID / Status / Cmp.' : 'แสดง Account ID / Status / Cmp.'}>
                      {showExtraCols ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </div>
                </th>
                {showExtraCols && <th className="px-2 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider">Ad Account ID</th>}
                {showExtraCols && <th className="px-2 py-3 text-center text-[11px] font-bold text-foreground-muted uppercase tracking-wider">Status</th>}
                {showExtraCols && <th className="px-2 py-3 text-center text-[11px] font-bold text-foreground-muted uppercase tracking-wider">Cmp.</th>}
                {([
                  ["spend",          "Spent (฿)"],
                  ["inbox",          "Inbox"],
                  ["cpi",            "CPI"],
                  ["leads",          "Lead"],
                  ["cpl",            "CPL"],
                  ["leadInboxRatio", "%Lead/Inbox"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)}
                    className="px-2 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider text-right cursor-pointer hover:text-gold-400 select-none transition-colors whitespace-nowrap min-w-[70px]">
                    <div className="flex items-center justify-end gap-1">
                      {label}
                      {sortKey === key
                        ? sortDir === "desc" ? <ChevronDown size={11} className="text-gold-400" /> : <ChevronUp size={11} className="text-gold-400" />
                        : <ChevronDown size={11} className="opacity-15" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={showExtraCols ? 10 : 7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-foreground-muted">
                      <Zap size={28} className="opacity-20" />
                      <p className="text-sm">ยังไม่มีข้อมูล — เลือกช่วงวันที่แล้วกด Sync</p>
                    </div>
                  </td>
                </tr>
              ) : pages.map((p, i) => {
                const avgSpend = kpis.totalSpend / pages.length;
                const avgInbox = kpis.totalInbox / pages.length;
                const avgLeads = kpis.totalLeads / pages.length;

                const spendGood = p.spend > 0 && p.spend < avgSpend * 0.85;
                const spendBad  = p.spend > avgSpend * 1.15;
                const inboxGood = p.inbox > avgInbox * 1.15;
                const inboxBad  = p.inbox > 0 && p.inbox < avgInbox * 0.85;
                const cpiGood   = p.cpi > 0 && p.cpi < kpis.avgCPI * 0.85;
                const cpiBad    = p.cpi > kpis.avgCPI * 1.15;
                const leadGood  = p.leads > avgLeads * 1.15;
                const leadBad   = p.leads > 0 && p.leads < avgLeads * 0.85;
                const cplGood   = p.cpl > 0 && p.cpl < kpis.avgCPL * 0.85;
                const cplBad    = p.cpl > kpis.avgCPL * 1.15;
                const ratioGood = p.leadInboxRatio > kpis.ratio * 1.15;
                const ratioBad  = p.leadInboxRatio > 0 && p.leadInboxRatio < kpis.ratio * 0.85;

                const good = "text-emerald-400 font-bold";
                const bad  = "text-red-400 font-bold ring-1 ring-red-500/40 rounded px-1.5 py-0.5 bg-red-500/10";
                const base = "text-foreground/80 font-medium";

                return (
                <tr key={p.pageName}
                  className="border-b border-border/30 hover:bg-navy-800/40 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                  <td className="px-3 py-2">
                    <Link href={`/page/${p.pageId}?since=${since}&until=${until}`} className="group/link flex items-center gap-1">
                      <p className="font-semibold text-foreground text-[13px] leading-tight truncate group-hover/link:text-gold-400 transition-colors" title={p.pageName}>{p.pageName}</p>
                      <ChevronRight size={12} className="text-foreground-muted/30 group-hover/link:text-gold-400 transition-colors shrink-0" />
                    </Link>
                  </td>
                  {showExtraCols && <td className="px-2 py-2">
                    <span className="text-xs font-mono text-foreground-muted/70 bg-navy-800 px-2 py-0.5 rounded">{p.adAccountId || '—'}</span>
                  </td>}
                  {showExtraCols && <td className="px-2 py-2 text-center"><StatusBadge p={p} /></td>}
                  {showExtraCols && <td className="px-2 py-2 text-center text-foreground-muted text-xs">{p.totalCampaigns}</td>}
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={spendGood ? good : spendBad ? bad : base}>{thb(p.spend)}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={inboxGood ? good : inboxBad ? bad : base}>{num(p.inbox)}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={cpiGood ? good : cpiBad ? bad : base}>{thb(p.cpi)}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={leadGood ? good : leadBad ? bad : base}>{p.leads}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={cplGood ? good : cplBad ? bad : base}>{thb(p.cpl)}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={p.inbox > 0 ? (ratioGood ? good : ratioBad ? bad : base) : "text-foreground-muted/30"}>
                      {p.inbox > 0 ? pct(p.leadInboxRatio) : "—"}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>

            {pages.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-navy-950/40">
                  <td className="px-4 py-4 text-xs font-bold text-foreground-muted uppercase" colSpan={showExtraCols ? 4 : 1}>
                    รวม {pages.length} เพจ
                  </td>
                  <td className="px-3 py-4 text-right font-bold text-gold-400 text-sm">{thb(kpis.totalSpend)}</td>
                  <td className="px-3 py-4 text-right font-bold text-blue-400 text-sm">{num(kpis.totalInbox)}</td>
                  <td className="px-3 py-4 text-right font-medium text-cyan-400/80 text-[11px]">avg {thb(kpis.avgCPI)}</td>
                  <td className="px-3 py-4 text-right font-bold text-purple-400 text-sm">{num(kpis.totalLeads)}</td>
                  <td className="px-3 py-4 text-right font-medium text-orange-400/80 text-[11px]">avg {thb(kpis.avgCPL)}</td>
                  <td className="px-3 py-4 text-right font-bold">
                    <span className={`px-2 py-1 rounded-lg text-xs ${kpis.ratio >= 20 ? "bg-emerald-500/10 text-emerald-400" : kpis.ratio >= 10 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                      {pct(kpis.ratio)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Performance by Service ── */}
      {view === 'service' && globalAdContent.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-950/40">
              <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider min-w-[160px]">Service</th>
                  {([
                    ['spend', 'Spent'], ['inbox', 'Inbox'], ['cpi', 'CPI'],
                    ['leads', 'Lead'], ['cpl', 'CPL'], ['adCount', 'Ads'], ['pageCount', 'เพจ'],
                  ] as [keyof GlobalAdItem, string][]).map(([k, label]) => (
                    <th key={k}
                      onClick={() => setSvcSort(prev => ({ key: k, dir: prev.key === k && prev.dir === 'desc' ? 'asc' : 'desc' }))}
                      className="px-3 py-2.5 text-right text-[11px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gold-400 select-none transition-colors">
                      <div className="flex items-center justify-end gap-0.5">
                        {label}
                        {svcSort.key === k
                          ? (svcSort.dir === 'desc' ? <ChevronDown size={10} className="text-gold-400" /> : <ChevronUp size={10} className="text-gold-400" />)
                          : <ChevronDown size={10} className="opacity-15" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...globalAdContent]
                  .filter(a => !serviceFilter || a.adName === serviceFilter)
                  .sort((a, b) => {
                    const av = (a[svcSort.key] as number) ?? 0;
                    const bv = (b[svcSort.key] as number) ?? 0;
                    return svcSort.dir === 'desc' ? bv - av : av - bv;
                  })
                  .map((svc, i) => (
                  <tr key={svc.adName + i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground text-[13px] truncate max-w-[200px] group-hover:text-gold-400 transition-colors" title={svc.adName}>{svc.adName}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-rose-400 whitespace-nowrap">{thb(svc.spend)}</td>
                    <td className="px-3 py-3.5 text-right font-bold text-blue-400 whitespace-nowrap">{num(svc.inbox)}</td>
                    <td className="px-3 py-3.5 text-right font-medium text-cyan-400/80 whitespace-nowrap">{thb(svc.cpi)}</td>
                    <td className="px-3 py-3.5 text-right font-bold text-purple-400 whitespace-nowrap">{svc.leads || "—"}</td>
                    <td className="px-3 py-3.5 text-right font-medium text-orange-400/80 whitespace-nowrap">{svc.leads > 0 ? thb(svc.cpl) : "—"}</td>
                    <td className="px-3 py-3.5 text-right text-foreground-muted text-xs">{svc.adCount}</td>
                    <td className="px-3 py-3.5 text-right text-foreground-muted text-xs">{svc.pageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}

      {/* ── Performance by Content (grouped by service, Top 3 each) ── */}
      {view === 'content' && globalAdByContent.length > 0 && (
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 justify-end px-4 py-2 border-b border-white/5 bg-navy-950/20">
              <span className="text-[9px] text-foreground-muted mr-1">Sort Content:</span>
              {(['spend', 'inbox', 'cpi', 'leads'] as const).map(k => (
                <button key={k}
                  onClick={() => setSvcSort(prev => ({ key: k, dir: prev.key === k && prev.dir === 'desc' ? 'asc' : 'desc' }))}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    svcSort.key === k
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
                  }`}>
                  {k === 'spend' ? 'Spent' : k === 'inbox' ? 'Inbox' : k === 'cpi' ? 'CPI' : 'Lead'}
                  {svcSort.key === k && (svcSort.dir === 'desc' ? ' ↓' : ' ↑')}
                </button>
              ))}
            </div>
            
            <table className="w-full text-sm">
              <thead className="bg-navy-950/40">
                <tr className="border-b border-white/10">
                    <th className="px-4 py-2 w-14"></th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold text-foreground-muted uppercase tracking-wider min-w-[140px]">Content</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Spent</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Inbox</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-wider">CPI</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Lead</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Conv%</th>
                  </tr>
                </thead>
                <tbody>
          {(serviceFilter ? [serviceFilter] : serviceNames)
            .filter(svcName => {
              if (!search) return true;
              const q = search.toLowerCase();
              const items = contentByService.get(svcName) ?? [];
              return svcName.toLowerCase().includes(q) || items.some(ad => (ad.pageNames ?? []).some(p => p.toLowerCase().includes(q)));
            })
            .map(svcName => {
            let items = contentByService.get(svcName) ?? [];
            if (search) {
              const q = search.toLowerCase();
              if (!svcName.toLowerCase().includes(q)) {
                items = items.filter(ad => (ad.pageNames ?? []).some(p => p.toLowerCase().includes(q)));
              }
            }
            if (items.length === 0) return null;
            const isExpanded = expandedServices.has(svcName);
            const displayItems = isExpanded ? items : items.slice(0, 3);
            const svcTotal = items.reduce((s, a) => s + a.spend, 0);
            const svcInbox = items.reduce((s, a) => s + a.inbox, 0);

            return (
              <Fragment key={svcName}>
                {/* Service group header row */}
                <tr className="bg-navy-950/20 border-b border-white/5">
                  <td colSpan={7} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/20">{svcName}</span>
                        <span className="text-[10px] text-foreground-muted">{items.length} contents · <span className="text-gold-400">{thb(svcTotal)}</span> · <span className="text-blue-400">{num(svcInbox)}</span> ib</span>
                      </div>
                      {items.length > 3 && (
                        <button
                          onClick={() => {
                            const next = new Set(expandedServices);
                            isExpanded ? next.delete(svcName) : next.add(svcName);
                            setExpandedServices(next);
                          }}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-foreground-muted hover:text-foreground transition-colors flex items-center gap-0.5">
                          {isExpanded ? (<><ChevronUp size={11} /> ซ่อน</>) : (<><ChevronDown size={11} /> ดูทั้งหมด ({items.length})</>)}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Content data rows */}
                {displayItems.map((ad, i) => (
                  <tr key={`${svcName}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                    <td className="px-4 py-2 w-14">
                      <div
                        onClick={() => ad.thumbnailUrl && setLightbox({ url: ad.thumbnailUrl, name: ad.adName, spend: ad.spend, inbox: ad.inbox, cpi: ad.cpi, mediaType: ad.mediaType, pageNames: ad.pageNames })}
                        className={`w-12 h-12 rounded-xl bg-navy-950/50 border border-white/5 overflow-hidden flex items-center justify-center group/thumb relative shadow-inner ${
                          ad.thumbnailUrl ? "cursor-pointer hover:border-gold-500/50 hover:shadow-gold-500/20" : ""
                        }`}>
                        {ad.thumbnailUrl ? (
                          <>
                            <img src={ad.thumbnailUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover peer"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fb = e.currentTarget.parentElement?.querySelector('[data-fallback]');
                                if (fb) (fb as HTMLElement).style.display = "flex";
                              }} />
                            <div data-fallback style={{ display: "none" }} className="absolute inset-0 items-center justify-center">
                              <Image size={14} className="text-foreground-muted/40" />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition-all flex items-center justify-center">
                              <ZoomIn size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                            {ad.mediaType === "video" && (
                              <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 shadow-sm">
                                <Play size={8} className="text-white fill-white" />
                              </div>
                            )}
                          </>
                        ) : (
                          <Image size={14} className="text-foreground-muted/20" />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {ad.mediaType && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              ad.mediaType === "video" ? "bg-cyan-500/15 text-cyan-400" : "bg-indigo-500/15 text-indigo-400"
                            }`}>{ad.mediaType === "video" ? "VDO" : "IMG"}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-foreground-muted">{ad.adCount} ads</span>
                          {(ad.pageBreakdown ?? []).length > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{ad.pageBreakdown!.length} เพจ</span>
                          )}
                        </div>
                        {/* Per-page breakdown */}
                        {(ad.pageBreakdown ?? []).map((pg, pi) => (
                          <div key={pi} className="flex items-center text-[10px] bg-navy-950/30 px-2 py-1 rounded w-fit border border-white/5" style={{ gap: "6px" }}>
                            <span className="text-foreground-muted/80 truncate font-medium" style={{ width: 140, flexShrink: 0 }}>{pg.pageName}</span>
                            <span className="text-rose-400/90 font-bold tabular-nums" style={{ width: 45, textAlign: "right", flexShrink: 0 }}>{thb(pg.spend)}</span>
                            <span className="text-blue-400/90 font-bold tabular-nums" style={{ width: 28, textAlign: "right", flexShrink: 0 }}>{num(pg.inbox)}<span className="text-[8px] ml-0.5 opacity-60">ib</span></span>
                            <span className="text-cyan-400/80 font-medium tabular-nums" style={{ width: 55, textAlign: "right", flexShrink: 0 }}><span className="text-[8px] opacity-60 mr-1">CPI</span>{pg.inbox > 0 ? thb(pg.spend / pg.inbox) : "—"}</span>
                            <span className="text-purple-400/90 font-bold tabular-nums" style={{ width: 28, textAlign: "right", flexShrink: 0 }}>{pg.leads}<span className="text-[8px] ml-0.5 opacity-60">ld</span></span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-rose-400 whitespace-nowrap text-sm">{thb(ad.spend)}</td>
                    <td className="px-3 py-3 text-right font-bold text-blue-400 whitespace-nowrap text-sm">{ad.inbox}</td>
                    <td className="px-3 py-3 text-right font-medium text-cyan-400/80 whitespace-nowrap text-xs">{thb(ad.cpi)}</td>
                    <td className="px-3 py-3 text-right font-bold text-purple-400 whitespace-nowrap text-sm">{ad.leads || "—"}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-xs">
                      {ad.convRate > 0 ? (
                        <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{pct(ad.convRate)}</span>
                      ) : <span className="text-foreground-muted/30">—</span>}
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
              </tbody>
            </table>
          </div>
      )}

      </div>{/* End Main Content Area */}

      {/* ── Lightbox Modal ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 max-w-3xl w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-12 right-0 flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm">
              <X size={16} /> ปิด
            </button>
            <div className="rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-black/50">
              <img src={lightbox.url} alt={lightbox.name} className="w-full h-auto max-h-[80vh] object-contain bg-navy-950" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
              {lightbox.mediaType && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  lightbox.mediaType === "video"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}>
                  {lightbox.mediaType === "video" ? "🎬 Video" : "📷 Image"}
                </span>
              )}
              <p className="text-sm font-semibold text-white truncate flex-1" title={lightbox.name}>{lightbox.name}</p>
              <span className="text-xs text-gold-400 font-bold">{thb(lightbox.spend)}</span>
              <span className="text-xs text-blue-400">Inbox: {lightbox.inbox}</span>
              <span className="text-xs text-foreground-muted">CPI: {thb(lightbox.cpi)}</span>
              {(lightbox.pageNames ?? []).length > 0 && (
                <span className="text-xs text-foreground-muted">เพจ: {(lightbox.pageNames ?? []).join(", ")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


