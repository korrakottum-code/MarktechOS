"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  DollarSign, Users, MessageCircle, Target, Eye,
  Activity, RefreshCw, X, ZoomIn,
  ArrowLeft, Calendar, TrendingUp, Image, ThumbsUp, MessageSquare, Share2, Play,
  Filter, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function thb(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function num(n: number) {
  return n.toLocaleString("th-TH");
}
function pct(n: number) { return `${n.toFixed(1)}%`; }

// ── Data types ────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; campaign: string; spend: number; inbox: number; cpi: number;
  leads: number; cpl: number; impressions: number; clicks: number;
  ctr: number; status: string;
}
interface DailyTrend {
  date: string; spend: number; inbox: number; leads: number; impressions: number;
}
interface AdContent {
  adName: string; campaignName: string; thumbnailUrl: string;
  spend: number; impressions: number; clicks: number; inbox: number;
  leads: number; cpi: number; cpl: number; ctr: number;
  likes: number; comments: number; shares: number; videoViews: number;
  adCount: number; convRate: number;
}

// ── Data hook ─────────────────────────────────────────────────────────────────
interface PageDataPayload {
  campaigns: Campaign[];
  trend: DailyTrend[];
  adContent: AdContent[];
  adByContent: AdContent[];
  pageName: string;
  adAccountId: string;
}

// Module-level cache keyed by `pageId|since|until` for instant re-renders when
// returning to a previously loaded range. Sync / manual refresh bypass it.
const pageDataCache = new Map<string, PageDataPayload>();
const pageDataCacheTime = new Map<string, number>();
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;

function usePageData(pageId: string, since: string, until: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trend, setTrend] = useState<DailyTrend[]>([]);
  const [adContent, setAdContent] = useState<AdContent[]>([]);
  const [adByContent, setAdByContent] = useState<AdContent[]>([]);
  const [pageName, setPageName] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((p: PageDataPayload) => {
    setCampaigns(p.campaigns);
    setTrend(p.trend);
    setAdContent(p.adContent);
    setAdByContent(p.adByContent);
    setPageName(p.pageName);
    setAdAccountId(p.adAccountId);
    setError(null);
  }, []);

  const load = useCallback(async (s: string, u: string, opts: { silent?: boolean; force?: boolean } = {}) => {
    const { silent = false, force = false } = opts;
    const key = `${pageId}|${s}|${u}`;

    if (!force) {
      const cached = pageDataCache.get(key);
      const ts = pageDataCacheTime.get(key) ?? 0;
      if (cached && Date.now() - ts < PAGE_CACHE_TTL_MS) {
        applyPayload(cached);
        setLoading(false);
        return;
      }
    }

    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/ads-data?pageId=${pageId}&since=${s}&until=${u}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const first = json.adsMetrics?.[0];
      const payload: PageDataPayload = {
        campaigns: json.adsMetrics ?? [],
        trend: json.dailyTrend ?? [],
        adContent: json.adContent ?? [],
        adByContent: json.adByContent ?? [],
        pageName: first ? (first.pageName || first.clinic) : "",
        adAccountId: first ? (first.adAccountId || "") : "",
      };
      pageDataCache.set(key, payload);
      pageDataCacheTime.set(key, Date.now());
      applyPayload(payload);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pageId, applyPayload]);

  useEffect(() => { load(since, until); }, [since, until, load]);

  // Auto-refresh every 5 min
  useEffect(() => {
    const iv = setInterval(() => load(since, until, { silent: true, force: true }), 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [since, until, load]);

  const reload = useCallback(() => load(since, until, { force: true }), [load, since, until]);

  return { campaigns, trend, adContent, adByContent, pageName, adAccountId, loading, error, reload };
}

type AdSort  = "spend" | "inbox" | "cpi" | "leads";

// ── Component ─────────────────────────────────────────────────────────────────
export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;

  const searchParams = useSearchParams();

  const yesterday = toISO(new Date(Date.now() - 864e5));
  const [since, setSince] = useState(() => searchParams.get("since") || yesterday);
  const [until, setUntil] = useState(() => searchParams.get("until") || yesterday);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [adSort, setAdSort]   = useState<AdSort>("spend");
  const [lightbox, setLightbox] = useState<{ url: string; name: string; spend: number; inbox: number; cpi: number; mediaType?: string } | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);

  const { campaigns, trend, adContent, adByContent, pageName, adAccountId, loading, error, reload } = usePageData(pageId, since, until);

  // ── Unique service names (sorted by spend) ───────────────────────────────
  const serviceNames = useMemo(() => {
    const sorted = [...adContent].sort((a, b) => b.spend - a.spend);
    return [...new Set(sorted.map(a => a.adName))].filter(Boolean);
  }, [adContent]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // ── Sorted ad content (filtered by service) ─────────────────────────────
  const sortedAds = useMemo(() => {
    const filtered = serviceFilter ? adContent.filter(a => a.adName === serviceFilter) : adContent;
    return [...filtered].sort((a, b) => {
      const av = a[adSort] as number;
      const bv = b[adSort] as number;
      return bv - av;
    });
  }, [adContent, adSort, serviceFilter]);

  const kpis = useMemo(() => {
    if (serviceFilter) {
      const s = sortedAds.reduce((a, c) => a + c.spend, 0);
      const im = sortedAds.reduce((a, c) => a + c.impressions, 0);
      const ib = sortedAds.reduce((a, c) => a + c.inbox, 0);
      const ld = sortedAds.reduce((a, c) => a + c.leads, 0);
      return {
        spend: s, impressions: im, inbox: ib, leads: ld,
        cpi: ib > 0 ? s / ib : 0,
        cpl: ld > 0 ? s / ld : 0,
        convRate: ib > 0 ? (ld / ib) * 100 : 0,
      };
    }
    const s  = campaigns.reduce((a, c) => a + c.spend, 0);
    const im = campaigns.reduce((a, c) => a + c.impressions, 0);
    const ib = campaigns.reduce((a, c) => a + c.inbox, 0);
    const ld = campaigns.reduce((a, c) => a + c.leads, 0);
    return {
      spend: s, impressions: im, inbox: ib, leads: ld,
      cpi: ib > 0 ? s / ib : 0,
      cpl: ld > 0 ? s / ld : 0,
      convRate: ib > 0 ? (ld / ib) * 100 : 0,
    };
  }, [campaigns, sortedAds, serviceFilter]);



  const sortedContentAds = useMemo(() => {
    const filtered = serviceFilter
      ? adByContent.filter(a => a.adName?.includes(serviceFilter) || (a as any).adNames?.includes(serviceFilter))
      : adByContent;
    return [...filtered].sort((a, b) => {
      const av = a[adSort] as number;
      const bv = b[adSort] as number;
      return bv - av;
    });
  }, [adByContent, adSort, serviceFilter]);

  // ── Chart ─────────────────────────────────────────────────────────────────
  const chartMax = useMemo(() => {
    return Math.max(...trend.map(t => t.inbox), 1);
  }, [trend]);
  const cpiMax = useMemo(() => {
    return Math.max(...trend.map(t => t.inbox > 0 ? t.spend / t.inbox : 0), 1);
  }, [trend]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await fetch(`/api/cron/sync-ads?since=${since}&until=${until}`);
      const json = await res.json();
      setSyncMsg(json.message ?? "Sync complete");
      setTimeout(() => reload(), 600);
    } catch { setSyncMsg("Sync failed"); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 7000); }
  }, [since, until, reload]);

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-2 border-gold-500/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-foreground-muted animate-pulse">กำลังโหลดข้อมูลเพจ...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">{error}</div>
    </div>
  );

  // ── Average for color coding ──────────────────────────────────────────────
  const avgAdCPI = adContent.length > 0 ? adContent.reduce((a, c) => a + c.cpi, 0) / adContent.filter(c => c.cpi > 0).length : 0;

  return (
    <div className="space-y-6 pt-4 sm:pt-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push(`/?since=${since}&until=${until}`)} className="flex items-center gap-1.5 text-foreground-muted hover:text-gold-400 transition-colors mb-2 text-sm">
            <ArrowLeft size={14} /> กลับ Dashboard
          </button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>🏥</span> {pageName || pageId}
          </h1>
          <p className="text-foreground-muted mt-0.5 text-sm">
            Page ID: {pageId} · Ad Account: {adAccountId || "—"} · {campaigns.length} campaigns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-navy-900 border border-border rounded-xl">
            <Calendar size={13} className="text-gold-400 shrink-0" />
            <input type="date" value={since} onChange={e => setSince(e.target.value)} className="bg-transparent text-xs text-foreground focus:outline-none w-28" />
            <span className="text-foreground-muted text-xs">→</span>
            <input type="date" value={until} onChange={e => setUntil(e.target.value)} className="bg-transparent text-xs text-foreground focus:outline-none w-28" />
          </div>
          <div className="flex gap-1">
            {[
              { label: "วันนี้",     s: toISO(new Date()), u: toISO(new Date()) },
              { label: "เมื่อวาน",   s: toISO(new Date(Date.now() - 864e5)), u: toISO(new Date(Date.now() - 864e5)) },
              { label: "7 วัน",      s: toISO(new Date(Date.now() - 6*864e5)), u: toISO(new Date()) },
              { label: "14 วัน",     s: toISO(new Date(Date.now() - 13*864e5)), u: toISO(new Date()) },
              { label: "เดือนนี้",   s: toISO(firstOfMonth()), u: toISO(new Date()) },
              { label: "เดือนที่แล้ว", s: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth()-1, 1)); })(), u: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth(), 0)); })() },
            ].map(p => (
              <button key={p.label} onClick={() => { setSince(p.s); setUntil(p.u); }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  since === p.s && until === p.u
                    ? "bg-gold-500/20 border-gold-500/40 text-gold-400"
                    : "bg-navy-800 border-border text-foreground-muted hover:text-foreground"
                }`}>{p.label}</button>
            ))}
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-60">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">{syncMsg}</div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Cost",        value: thb(kpis.spend),       icon: DollarSign,    color: "text-gold-400",    bg: "from-gold-500/20 to-gold-500/5" },
          { label: "Impressions", value: num(kpis.impressions), icon: Eye,           color: "text-sky-400",     bg: "from-sky-500/20 to-sky-500/5" },
          { label: "Inbox",       value: num(kpis.inbox),       icon: MessageCircle, color: "text-blue-400",    bg: "from-blue-500/20 to-blue-500/5" },
          { label: "Cost/Inbox",  value: thb(kpis.cpi),         icon: Target,        color: "text-cyan-400",    bg: "from-cyan-500/20 to-cyan-500/5" },
          { label: "Lead",        value: num(kpis.leads),       icon: Users,         color: "text-purple-400",  bg: "from-purple-500/20 to-purple-500/5" },
          { label: "Cost/Lead",   value: kpis.leads > 0 ? thb(kpis.cpl) : "—", icon: Target, color: "text-orange-400", bg: "from-orange-500/20 to-orange-500/5" },
          { label: "Conv%",       value: pct(kpis.convRate),    icon: Activity,      color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="stat-card animate-fade-in hover:border-gold-500/30 transition-all !py-4 !px-5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={card.color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground tracking-tight leading-tight">{card.value}</p>
                  <p className="text-[10px] text-foreground-muted font-medium">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Daily Trend Chart ── */}
      {trend.length > 0 && (
        <div className="bg-navy-900 border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gold-400" />
            <h2 className="text-sm font-bold text-foreground">Overview — Inbox & CPI รายวัน</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy-800 text-foreground-muted border border-border">{trend.length} วัน</span>
          </div>
          <div className="relative h-48 flex items-end gap-[2px]">
            {trend.map((t, i) => {
              const barH = (t.inbox / chartMax) * 100;
              const cpi = t.inbox > 0 ? t.spend / t.inbox : 0;
              const cpiH = (cpi / cpiMax) * 100;
              const dayLabel = t.date.slice(8);
              return (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ minWidth: 0 }}>
                  {/* CPI dot */}
                  <div className="absolute w-full flex justify-center" style={{ bottom: `${cpiH}%` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Inbox bar */}
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-gold-500/80 to-gold-400/60 group-hover:from-gold-400 group-hover:to-gold-300 transition-all cursor-pointer relative"
                    style={{ height: `${Math.max(barH, 2)}%` }}
                    title={`${t.date}\nInbox: ${t.inbox}\nCPI: ${thb(cpi)}\nSpend: ${thb(t.spend)}\nLeads: ${t.leads}`}
                  />
                  {/* Date label */}
                  {(trend.length <= 31 || i % 2 === 0) && (
                    <span className="text-[8px] text-foreground-muted/50 leading-none">{dayLabel}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-[10px] font-bold text-foreground-muted">
            <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-gold-500/70" /> Inbox</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> CPI</span>
          </div>
        </div>
      )}

      {/* ── Main Data Area (Performance by Service) ── */}
      <div className="bg-navy-900/80 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl animate-fade-in" style={{ animationDelay: '500ms' }}>
        
        {/* Service Filter / Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-navy-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Image size={16} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Performance by Service</h2>
              <p className="text-[10px] text-foreground-muted">{sortedAds.length} services found</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-navy-950/80 p-1 rounded-2xl border border-white/5 overflow-x-auto shadow-inner">
            {(["spend", "inbox", "cpi", "leads"] as AdSort[]).map(key => (
              <button key={key} onClick={() => setAdSort(key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  adSort === key ? "bg-gold-500 text-navy-950 shadow-md" : "text-foreground-muted hover:text-foreground hover:bg-white/5"
                }`}>Sort: {key.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Filter Pills */}
        {serviceNames.length > 1 && (
          <div className="px-5 py-3 border-b border-white/5 bg-navy-900/30 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Filter size={14} className="text-purple-400 shrink-0 mr-1" />
            <button
              onClick={() => setServiceFilter(null)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                !serviceFilter
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-navy-950/50 border-white/5 text-foreground-muted hover:text-foreground hover:bg-white/10"
              }`}>
              ทั้งหมด
            </button>
            <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
            {serviceNames.map(name => (
              <button key={name}
                onClick={() => setServiceFilter(serviceFilter === name ? null : name)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                  serviceFilter === name
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                    : "bg-navy-950/50 border-white/5 text-foreground-muted hover:text-foreground hover:bg-white/10"
                }`}>
                {name}
              </button>
            ))}
          </div>
        )}

      {/* ── Ad Content Performance (Table) ── */}
      {sortedAds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-950/40">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider min-w-[200px]">Service Name</th>
                  {[
                    { key: "spend" as AdSort, label: "Spent" },
                    { key: "inbox" as AdSort, label: "Inbox" },
                    { key: "cpi" as AdSort, label: "CPI" },
                    { key: "leads" as AdSort, label: "Lead" },
                    { key: "cpi" as AdSort, label: "CPL", sortKey: "leads" as AdSort },
                    { key: "leads" as AdSort, label: "%Lead/Inbox", sortKey: "leads" as AdSort },
                  ].map(col => (
                    <th key={col.label}
                      onClick={() => setAdSort(col.sortKey ?? col.key)}
                      className={`px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-gold-400 ${
                        adSort === (col.sortKey ?? col.key) ? "text-gold-400" : "text-foreground-muted"
                      }`}>
                      {col.label} {adSort === (col.sortKey ?? col.key) ? "↓" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAds.map((ad, i) => {
                  const cpiColor = ad.cpi > 0 && avgAdCPI > 0
                    ? ad.cpi < avgAdCPI * 0.85 ? "text-emerald-400 font-bold" : ad.cpi > avgAdCPI * 1.15 ? "text-red-400 font-bold" : "text-cyan-400/80 font-medium"
                    : "text-foreground-muted";

                  return (
                    <tr key={ad.adName + i}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground text-[13px] leading-tight truncate max-w-[450px] group-hover:text-gold-400 transition-colors" title={ad.adName}>{ad.adName}</p>
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-rose-400 text-sm">{thb(ad.spend)}</td>
                      <td className="px-3 py-3.5 text-right font-bold text-blue-400 text-sm">{ad.inbox}</td>
                      <td className="px-3 py-3.5 text-right"><span className={cpiColor}>{thb(ad.cpi)}</span></td>
                      <td className="px-3 py-3.5 text-right text-purple-400 font-bold text-sm">{ad.leads || "—"}</td>
                      <td className="px-3 py-3.5 text-right text-orange-400/80 font-medium">{ad.leads > 0 ? thb(ad.spend / ad.leads) : "—"}</td>
                      <td className="px-3 py-3.5 text-right">
                        {ad.convRate > 0 ? (
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{pct(ad.convRate)}</span>
                        ) : <span className="text-foreground-muted/30 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals row */}
              <tfoot>
                <tr className="border-t border-white/10 bg-navy-950/40">
                  <td className="px-4 py-4 text-xs font-bold text-foreground-muted uppercase">รวม {sortedAds.length} Services</td>
                  <td className="px-3 py-4 text-right font-bold text-gold-400 text-sm">{thb(sortedAds.reduce((s, a) => s + a.spend, 0))}</td>
                  <td className="px-3 py-4 text-right font-bold text-blue-400 text-sm">{sortedAds.reduce((s, a) => s + a.inbox, 0)}</td>
                  <td className="px-3 py-4 text-right font-medium text-cyan-400/80 text-[11px]">
                    avg {thb(sortedAds.reduce((s, a) => s + a.spend, 0) / Math.max(sortedAds.reduce((s, a) => s + a.inbox, 0), 1))}
                  </td>
                  <td className="px-3 py-4 text-right font-bold text-purple-400 text-sm">{sortedAds.reduce((s, a) => s + a.leads, 0)}</td>
                  <td className="px-3 py-4 text-right font-medium text-orange-400/80 text-[11px]">
                    avg {thb(sortedAds.reduce((s, a) => s + a.spend, 0) / Math.max(sortedAds.reduce((s, a) => s + a.leads, 0), 1))}
                  </td>
                  <td className="px-3 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
      )}

      </div>{/* End Main Data Area */}

      {/* ── Performance by Content (each ad separately) ── */}
      {sortedContentAds.length > 0 && (
        <div className="bg-navy-900/80 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="px-4 sm:p-5 border-b border-white/5 bg-navy-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Image size={16} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Top Content Performance</h2>
                <p className="text-[10px] text-foreground-muted">{sortedContentAds.length} ads found</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-950/40">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider w-14"></th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider min-w-[120px]">Content</th>
                  {[
                    { key: "spend" as AdSort, label: "Spent" },
                    { key: "inbox" as AdSort, label: "Inbox" },
                    { key: "cpi" as AdSort, label: "CPI" },
                    { key: "leads" as AdSort, label: "Lead" },
                    { key: "cpi" as AdSort, label: "CPL", sortKey: "leads" as AdSort },
                    { key: "leads" as AdSort, label: "%Lead/Inbox", sortKey: "leads" as AdSort },
                  ].map(col => (
                    <th key={col.label}
                      onClick={() => setAdSort(col.sortKey ?? col.key)}
                      className={`px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-gold-400 ${
                        adSort === (col.sortKey ?? col.key) ? "text-gold-400" : "text-foreground-muted"
                      }`}>
                      {col.label} {adSort === (col.sortKey ?? col.key) ? "↓" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContentAds.map((ad, i) => {
                  const cpiColor = ad.cpi > 0 && avgAdCPI > 0
                    ? ad.cpi < avgAdCPI * 0.85 ? "text-emerald-400 font-bold" : ad.cpi > avgAdCPI * 1.15 ? "text-red-400 font-bold" : "text-cyan-400/80 font-medium"
                    : "text-foreground-muted";
                  return (
                    <tr key={(ad as any).adId ?? ad.adName + i}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                      <td className="px-4 py-2">
                        <div
                          onClick={() => ad.thumbnailUrl && setLightbox({ url: ad.thumbnailUrl, name: ad.adName, spend: ad.spend, inbox: ad.inbox, cpi: ad.cpi, mediaType: (ad as any).mediaType })}
                          className={`w-12 h-12 rounded-xl bg-navy-950/50 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center group/thumb relative shadow-inner ${
                            ad.thumbnailUrl ? "cursor-pointer hover:border-gold-500/50 hover:shadow-gold-500/20" : ""
                          }`}>
                          {ad.thumbnailUrl ? (
                            <>
                              <img
                                src={ad.thumbnailUrl}
                                alt={ad.adName}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover peer"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  img.style.display = "none";
                                  img.parentElement!.querySelector(".thumb-fallback")?.classList.remove("hidden");
                                }}
                              />
                              <div className="thumb-fallback hidden w-full h-full flex items-center justify-center absolute inset-0">
                                <Image size={14} className="text-foreground-muted/30" />
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition-all flex items-center justify-center">
                                <ZoomIn size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-md" />
                              </div>
                              {/* Media type badge */}
                              {(ad as any).mediaType === "video" && (
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
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          <p className="font-semibold text-foreground text-[13px] leading-tight truncate max-w-[400px] group-hover/row:text-gold-400 transition-colors" title={ad.adName}>{ad.adName}</p>
                          <div className="flex items-center gap-1.5">
                            {(ad as any).mediaType && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                (ad as any).mediaType === "video" ? "bg-cyan-500/15 text-cyan-400" : "bg-indigo-500/15 text-indigo-400"
                              }`}>{(ad as any).mediaType === "video" ? "VDO" : "IMG"}</span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-foreground-muted">{(ad as any).adCount || 1} ads</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-400 text-sm">{thb(ad.spend)}</td>
                      <td className="px-3 py-3 text-right font-bold text-blue-400 text-sm">{ad.inbox}</td>
                      <td className="px-3 py-3 text-right"><span className={cpiColor}>{thb(ad.cpi)}</span></td>
                      <td className="px-3 py-3 text-right text-purple-400 font-bold text-sm">{ad.leads || "—"}</td>
                      <td className="px-3 py-3 text-right text-orange-400/80 font-medium">{ad.leads > 0 ? thb(ad.spend / ad.leads) : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {ad.convRate > 0 ? (
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{pct(ad.convRate)}</span>
                        ) : <span className="text-foreground-muted/30 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Content */}
          <div className="relative z-10 max-w-3xl w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setLightbox(null)}
              className="absolute -top-12 right-0 flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm">
              <X size={16} /> ปิด
            </button>

            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-black/50">
              <img src={lightbox.url} alt={lightbox.name} className="w-full h-auto max-h-[80vh] object-contain bg-navy-950" />
            </div>

            {/* Info bar */}
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
              <p className="text-sm font-semibold text-white whitespace-normal break-words flex-1" title={lightbox.name}>{lightbox.name}</p>
              <span className="text-xs text-gold-400 font-bold">{thb(lightbox.spend)}</span>
              <span className="text-xs text-blue-400">Inbox: {lightbox.inbox}</span>
              <span className="text-xs text-foreground-muted">CPI: {thb(lightbox.cpi)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

