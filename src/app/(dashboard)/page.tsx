"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdsMetric } from "@/lib/app-data-types";
import {
  DollarSign, Users, MessageCircle, Target,
  Activity, Search, RefreshCw, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Zap, AlertCircle, Calendar,
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

function useAdsData(since: string, until: string) {
  const [metrics, setMetrics] = useState<AdsMetric[]>([]);
  const [meta, setMeta] = useState<AdsDataMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: string, u: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/ads-data?since=${s}&until=${u}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMetrics(json.adsMetrics ?? []);
      setMeta({
        dailyRowCount: json.dailyRowCount ?? 0,
        dataAvailable: json.dataAvailable ?? { from: '', to: '' },
        lastSyncedAt: json.lastSyncedAt ?? null,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on date range change
  useEffect(() => {
    load(since, until);
  }, [since, until, load]);

  // Auto-refresh every 5 minutes (silent — no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      load(since, until, true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [since, until, load]);

  const reload = useCallback(() => load(since, until), [load, since, until]);

  // Check if data is stale (last sync > 1 hour ago)
  const isStale = useMemo(() => {
    if (!meta?.lastSyncedAt) return true;
    return Date.now() - new Date(meta.lastSyncedAt).getTime() > STALE_THRESHOLD_MS;
  }, [meta?.lastSyncedAt]);

  return { metrics, meta, loading, error, reload, isStale };
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
export default function FacebookAdsDashboard() {
  const searchParams = useSearchParams();
  // Date range state — restore from URL if navigating back from detail page
  const [since, setSince] = useState(() => searchParams.get("since") || toISO(firstOfMonth()));
  const [until, setUntil] = useState(() => searchParams.get("until") || toISO(new Date()));

  const { metrics: raw, meta, loading, error, reload, isStale } = useAdsData(since, until);

  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showExtraCols, setShowExtraCols] = useState(false);

  // ── Aggregate & filter ───────────────────────────────────────────────────────
  const pages = useMemo(() => {
    const grouped = groupByPage(raw);
    return grouped
      .filter(p => search === "" || p.pageName.toLowerCase().includes(search.toLowerCase()) || p.adAccountId.includes(search))
      .sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [raw, search, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const totalSpend = pages.reduce((s, p) => s + p.spend, 0);
    const totalInbox = pages.reduce((s, p) => s + p.inbox, 0);
    const totalLeads = pages.reduce((s, p) => s + p.leads, 0);
    return {
      totalSpend,
      totalInbox,
      totalLeads,
      avgCPI:  totalInbox > 0 ? totalSpend / totalInbox : 0,
      avgCPL:  totalLeads > 0 ? totalSpend / totalLeads : 0,
      ratio:   totalInbox > 0 ? (totalLeads / totalInbox) * 100 : 0,
      active:  raw.filter(m => m.status === "active").length,
    };
  }, [pages, raw]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  // ── Sync handler ─────────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch(`/api/cron/sync-ads?since=${since}&until=${until}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setSyncMsg(`⚠️ ${json.error || "Sync failed"}`);
      } else {
        setSyncMsg(json.message ?? "Sync complete");
        // Reload data after sync completes
        setTimeout(() => reload(), 600);
      }
    } catch {
      setSyncMsg("❌ Sync failed — ตรวจสอบ token");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 7000);
    }
  }, [since, until, reload]);

  // ── Auto-sync if data is stale ──────────────────────────────────────────────
  const autoSyncTriggered = useRef(false);
  useEffect(() => {
    if (isStale && !syncing && !autoSyncTriggered.current && meta !== null) {
      autoSyncTriggered.current = true;
      console.log("🔄 Auto-sync: data is stale, triggering background sync...");
      handleSync();
    }
  }, [isStale, syncing, meta, handleSync]);
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
    <div className="space-y-6 pt-4 sm:pt-6">

      {/* ── Header ── */}
      <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>📊</span> Facebook Ads Dashboard
          </h1>
          <p className="text-foreground-muted mt-0.5 text-sm">{pages.length} เพจ · {raw.length} campaigns · 📅 {since} → {until}</p>
        </div>

        {/* ── Date Range + Sync ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-navy-900 border border-border rounded-xl">
            <Calendar size={13} className="text-gold-400 shrink-0" />
            <input
              type="date" value={since} onChange={e => setSince(e.target.value)}
              disabled={syncing}
              className={`bg-transparent text-xs text-foreground focus:outline-none w-28 ${syncing ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
            <span className="text-foreground-muted text-xs">→</span>
            <input
              type="date" value={until} onChange={e => setUntil(e.target.value)}
              disabled={syncing}
              className={`bg-transparent text-xs text-foreground focus:outline-none w-28 ${syncing ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-1">
            {[
              { label: "วันนี้",     s: toISO(new Date()), u: toISO(new Date()) },
              { label: "เมื่อวาน",   s: toISO(new Date(Date.now() - 864e5)), u: toISO(new Date(Date.now() - 864e5)) },
              { label: "7 วัน",      s: toISO(new Date(Date.now() - 6*864e5)), u: toISO(new Date()) },
              { label: "14 วัน",     s: toISO(new Date(Date.now() - 13*864e5)), u: toISO(new Date()) },
              { label: "เดือนนี้",   s: toISO(firstOfMonth()), u: toISO(new Date()) },
              { label: "เดือนที่แล้ว", s: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth()-1, 1)); })(), u: (() => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth(), 0)); })() },
            ].map(p => (
              <button key={p.label} disabled={syncing} onClick={() => { setSince(p.s); setUntil(p.u); }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  since === p.s && until === p.u
                    ? "bg-gold-500/20 border-gold-500/40 text-gold-400"
                    : "bg-navy-800 border-border text-foreground-muted hover:text-foreground"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-60">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>
      </div>

      {syncMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          {syncMsg}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Spent",  value: thb(kpis.totalSpend), icon: DollarSign,    color: "text-gold-400",    bg: "from-gold-500/20 to-gold-500/5" },
          { label: "Inbox รวม",    value: num(kpis.totalInbox), icon: MessageCircle, color: "text-blue-400",    bg: "from-blue-500/20 to-blue-500/5" },
          { label: "Cost/Inbox",   value: thb(kpis.avgCPI),     icon: Target,        color: "text-cyan-400",    bg: "from-cyan-500/20 to-cyan-500/5" },
          { label: "Lead รวม",     value: num(kpis.totalLeads), icon: Users,         color: "text-purple-400",  bg: "from-purple-500/20 to-purple-500/5" },
          { label: "Cost/Lead",    value: thb(kpis.avgCPL),     icon: Target,        color: "text-rose-400",    bg: "from-rose-500/20 to-rose-500/5" },
          { label: "%Lead/Inbox",  value: pct(kpis.ratio),      icon: Activity,      color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" },
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

      {/* ── Page Table ── */}
      <div className="bg-navy-900 border border-border rounded-2xl">

          <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-gold-400" />
              <h2 className="text-sm font-bold text-foreground">ผลงานรายเพจ</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy-800 text-foreground-muted border border-border">{pages.length} เพจ</span>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input type="text" placeholder="ค้นหาชื่อเพจ / Account ID..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-navy-800 border border-border rounded-xl text-xs text-foreground placeholder:text-foreground-muted/40 focus:outline-none focus:border-gold-500/50 w-52" />
            </div>
          </div>

          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border/60 bg-navy-950">
                <th className="px-3 py-3 text-left text-[11px] font-bold text-foreground-muted uppercase tracking-wider w-[260px] max-w-[260px]">
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
                    className="px-2 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider text-right cursor-pointer hover:text-gold-400 select-none transition-colors">
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
                  <td className="px-2 py-2 text-right">
                    <span className={spendGood ? good : spendBad ? bad : base}>{thb(p.spend)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={inboxGood ? good : inboxBad ? bad : base}>{num(p.inbox)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={cpiGood ? good : cpiBad ? bad : base}>{thb(p.cpi)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={leadGood ? good : leadBad ? bad : base}>{p.leads}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className={cplGood ? good : cplBad ? bad : base}>{thb(p.cpl)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
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
                <tr className="border-t-2 border-gold-500/20 bg-navy-800">
                  <td className="px-4 py-3.5 text-[11px] font-bold text-foreground-muted uppercase" colSpan={showExtraCols ? 4 : 1}>
                    รวม {pages.length} เพจ
                  </td>
                  <td className="px-3 py-3.5 text-right font-bold text-gold-400">{thb(kpis.totalSpend)}</td>
                  <td className="px-3 py-3.5 text-right font-bold text-foreground/90">{num(kpis.totalInbox)}</td>
                  <td className="px-3 py-3.5 text-right font-bold text-foreground/70 text-[11px]">avg {thb(kpis.avgCPI)}</td>
                  <td className="px-3 py-3.5 text-right font-bold text-foreground/90">{num(kpis.totalLeads)}</td>
                  <td className="px-3 py-3.5 text-right font-bold text-foreground/70 text-[11px]">avg {thb(kpis.avgCPL)}</td>
                  <td className="px-3 py-3.5 text-right font-bold">
                    <span className={kpis.ratio >= 20 ? "text-emerald-400" : kpis.ratio >= 10 ? "text-amber-400" : "text-red-400"}>
                      {pct(kpis.ratio)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
      </div>
    </div>
  );
}


