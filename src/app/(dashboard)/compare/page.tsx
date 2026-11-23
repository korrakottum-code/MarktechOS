"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Info, Loader2, MessageCircle } from "lucide-react";
import MarkTechDatePicker from "@/components/ui/DatePicker";

// ── Types (mirror /api/compare) ──────────────────────────────────────────────
interface Metrics {
  spend: number; inbox: number; leads: number; chats: number; closes: number;
  queues: number; pending: number; newChats: number; closes1h: number; chatSpend: number;
}
interface Row { key: string; cur: Metrics; prev: Metrics; pageName?: string; chatSource?: string; service?: string; price?: number | null }
interface Decomp { actual: number; prevActual: number; atPrevRate: number; expected: number; mixEffect: number; efficiencyEffect?: number; rateEffect?: number }
interface Flag { level: "warn" | "info" | "good"; pageName?: string; key?: string; text: string }
interface CompareData {
  ranges: { cur: { since: string; until: string; days: number }; prev: { since: string; until: string; days: number } };
  overview: Row;
  chatOverview: { cur: Metrics; prev: Metrics };
  byPage: Row[]; byService: Row[]; byPrice: Row[];
  decomposition: { chats: Decomp | null; closes: Decomp | null };
  flags: Flag[];
  flagsTotal?: number;
  hours: { hour: number; chats: number; closes: number; closes1h: number }[];
  medianMinutesToClose: number | null;
  chatCoverage: Record<string, { syncedThrough: string; complete: boolean; error: string }>;
  excluded: { cur: { spend: number; inbox: number }; prev: { spend: number; inbox: number }; campaigns: { name: string; kind: string; spend: number }[] };
  unknownAds: UnknownAd[];
  mappedAds: { nameKey: string; service: string; price: number | null; exclude: boolean }[];
  services: string[];
}
interface UnknownAd { nameKey: string; adName: string; campaignName: string; spend: number; inbox: number; pages: string[]; creativeText: string }

// ── Formatting ───────────────────────────────────────────────────────────────
const thb = (n: number) => (Number.isFinite(n) && n > 0 ? `฿${Math.round(n).toLocaleString("en-US")}` : "—");
const num = (n: number, d = 0) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");
const pct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%` : "—");
const div = (a: number, b: number) => (b > 0 ? a / b : NaN);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Better = "up" | "down";
interface Col { label: string; get: (m: Metrics, days: number) => number; fmt: (n: number) => string; better: Better; chat?: boolean }
const COLS: Col[] = [
  { label: "งบ/วัน", get: (m, d) => m.spend / d, fmt: thb, better: "up" },
  { label: "แชท/วัน", get: (m, d) => m.inbox / d, fmt: n => num(n, 1), better: "up" },
  { label: "ลีด/วัน", get: (m, d) => m.leads / d, fmt: n => num(n, 1), better: "up" },
  { label: "%แชท→ลีด", get: m => div(m.leads, m.inbox), fmt: pct, better: "up" },
  { label: "฿/แชท", get: m => div(m.spend, m.inbox), fmt: thb, better: "down" },
  { label: "฿/ลีด", get: m => div(m.spend, m.leads), fmt: thb, better: "down" },
  { label: "%ปิด", get: m => div(m.closes, m.chats), fmt: pct, better: "up", chat: true },
  { label: "คิว/วัน", get: (m, d) => (m.chats > 0 ? m.queues / d : NaN), fmt: n => num(n, 1), better: "up", chat: true },
  { label: "฿/ปิด", get: m => div(m.chatSpend, m.closes), fmt: thb, better: "down", chat: true },
  { label: "ลีดค้าง", get: m => (m.chats > 0 ? m.pending : NaN), fmt: n => num(n), better: "down", chat: true },
];

function Delta({ cur, prev, better }: { cur: number; prev: number; better: Better }) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  const change = (cur - prev) / Math.abs(prev);
  if (Math.abs(change) < 0.03) return <span className="text-foreground-muted">≈</span>;
  const good = better === "up" ? change > 0 : change < 0;
  return (
    <span className={good ? "text-emerald-400" : "text-rose-400"}>
      {good ? "✅" : "🔻"} {change > 0 ? "+" : ""}{Math.round(change * 100)}%
    </span>
  );
}

function Cell({ col, row, days }: { col: Col; row: Row; days: { cur: number; prev: number } }) {
  const c = col.get(row.cur, days.cur);
  const p = col.get(row.prev, days.prev);
  return (
    <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
      <div className="text-xs font-semibold text-foreground">{col.fmt(c)}</div>
      <div className="text-[10px] text-foreground-muted">
        {col.fmt(p)} <Delta cur={c} prev={p} better={col.better} />
      </div>
    </td>
  );
}

const SOURCE_LABEL: Record<string, { text: string; cls: string }> = {
  pancake: { text: "Pancake", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "pancake-partial": { text: "Pancake (กำลังดึง)", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  none: { text: "ไม่ได้นับ", cls: "bg-navy-800 text-foreground-muted border-border" },
};

function Table({ rows, days, kind, showChat }: { rows: Row[]; days: { cur: number; prev: number }; kind: "page" | "service" | "price"; showChat: boolean }) {
  const cols = COLS.filter(c => showChat || !c.chat);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2.5 text-[10px] font-bold text-foreground-muted uppercase min-w-[180px]">
              {kind === "page" ? "เพจ" : kind === "service" ? "บริการ" : "แอด (ราคา)"}
            </th>
            {cols.map(c => <th key={c.label} className="px-3 py-2.5 text-[10px] font-bold text-foreground-muted text-right whitespace-nowrap">{c.label}</th>)}
            {kind === "page" && <th className="px-3 py-2.5 text-[10px] font-bold text-foreground-muted">แหล่งแชท</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-border/50 hover:bg-navy-800/40">
              <td className="px-3 py-2.5 align-top">
                <div className="text-xs font-semibold text-foreground max-w-[260px] truncate" title={r.pageName ?? r.key}>{r.pageName ?? r.key}</div>
                {kind === "price" && r.service && r.service !== r.key && <div className="text-[10px] text-foreground-muted">{r.service}</div>}
              </td>
              {cols.map(c => <Cell key={c.label} col={c} row={r} days={days} />)}
              {kind === "page" && (
                <td className="px-3 py-2.5 align-top">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${SOURCE_LABEL[r.chatSource ?? "none"].cls}`}>
                    {SOURCE_LABEL[r.chatSource ?? "none"].text}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecompCard({ title, unit, d, prevLabel }: { title: string; unit: string; d: Decomp; prevLabel: string }) {
  const second = d.rateEffect ?? d.efficiencyEffect ?? 0;
  const secondLabel = d.rateEffect !== undefined ? "แอดตัวเดิมปิดได้ต่างไป" : "฿/แชทของแอดตัวเดิมเปลี่ยน";
  const sign = (n: number) => `${n >= 0 ? "+" : ""}${num(n)}`;
  return (
    <div className="bg-navy-900 border border-border rounded-2xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-foreground-muted">{prevLabel}</span><span>{num(d.prevActual)} {unit}</span></div>
        <div className="flex justify-between"><span className="text-foreground-muted">ช่วงนี้ ถ้าประสิทธิภาพเท่าเดือนก่อน</span><span>{num(d.atPrevRate)} {unit}</span></div>
        <div className="flex justify-between"><span className="text-foreground-muted">ผลจาก mix (งบย้ายไปแอด/บริการอื่น)</span><span className={d.mixEffect >= 0 ? "text-emerald-400" : "text-rose-400"}>{sign(d.mixEffect)}</span></div>
        <div className="flex justify-between"><span className="text-foreground-muted">ผลจาก{secondLabel}</span><span className={second >= 0 ? "text-emerald-400" : "text-rose-400"}>{sign(second)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>ได้จริงช่วงนี้</span><span>{num(d.actual)} {unit}</span></div>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { awareness: "Awareness/Engagement", hr: "สมัครงาน", manual: "ตั้งว่าไม่ใช่แอดขาย" };

function MapRow({ ad, onSaved }: { ad: UnknownAd; onSaved: () => void }) {
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [exclude, setExclude] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/ad-service-map", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adName: ad.adName, service, price: price || null, exclude }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  }
  return (
    <tr className="border-b border-border/50 align-top">
      <td className="px-3 py-2.5 max-w-[280px]">
        <div className="text-xs font-semibold text-foreground truncate" title={ad.adName}>{ad.adName}</div>
        <div className="text-[10px] text-foreground-muted truncate" title={ad.campaignName}>{ad.campaignName}</div>
        <div className="text-[10px] text-foreground-muted truncate" title={ad.pages.join(", ")}>{ad.pages.join(", ")}</div>
      </td>
      <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">{thb(ad.spend)}<div className="text-[10px] text-foreground-muted">{num(ad.inbox)} แชท</div></td>
      <td className="px-3 py-2.5 text-[10px] text-foreground-muted max-w-[320px]"><div className="line-clamp-3" title={ad.creativeText}>{ad.creativeText || "—"}</div></td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input list="known-services" value={service} onChange={e => setService(e.target.value)} disabled={exclude} placeholder="บริการ"
            className="w-32 bg-navy-950 border border-border rounded-lg px-2 py-1 text-xs text-foreground disabled:opacity-40" />
          <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ""))} disabled={exclude} placeholder="ราคา" inputMode="numeric"
            className="w-20 bg-navy-950 border border-border rounded-lg px-2 py-1 text-xs text-foreground disabled:opacity-40" />
          <label className="flex items-center gap-1 text-[10px] text-foreground-muted whitespace-nowrap">
            <input type="checkbox" checked={exclude} onChange={e => setExclude(e.target.checked)} /> ไม่ใช่แอดขาย
          </label>
          <button onClick={save} disabled={saving || (!service.trim() && !exclude)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gold-500/15 text-gold-400 border border-gold-500/20 disabled:opacity-40">
            {saving ? "…" : "บันทึก"}
          </button>
        </div>
        {err && <div className="text-[10px] text-rose-400 mt-1">{err}</div>}
      </td>
    </tr>
  );
}

function ServiceMapping({ data, onChanged }: { data: CompareData; onChanged: () => void }) {
  const [showMapped, setShowMapped] = useState(false);
  async function remove(nameKey: string) {
    await fetch(`/api/ad-service-map?nameKey=${encodeURIComponent(nameKey)}`, { method: "DELETE" });
    onChanged();
  }
  const unknownSpend = data.unknownAds.reduce((a, u) => a + u.spend, 0);
  if (data.unknownAds.length === 0 && data.mappedAds.length === 0) return null;
  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden mb-6">
      <div className="p-5 pb-3">
        <h3 className="text-sm font-bold text-foreground">แอดที่ยังไม่รู้บริการ</h3>
        <p className="text-[10px] text-foreground-muted mt-1">
          ระบบหาบริการจากชื่อแอด → ชื่อแคมเปญ → ข้อความในแอด ถ้ายังไม่เจอจะรวมไว้ที่ &quot;ไม่ระบุบริการ&quot; (งบรวม 2 ช่วง {thb(unknownSpend)}) ·
          ผูกครั้งเดียวใช้กับทุกแอดที่ชื่อเดียวกัน
        </p>
      </div>
      <datalist id="known-services">{data.services.map(s => <option key={s} value={s} />)}</datalist>
      {data.unknownAds.length > 0 && (
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-navy-900">
              <tr className="border-b border-border">
                {["ชื่อแอด / แคมเปญ / เพจ", "งบ", "ข้อความในแอด", "ผูกบริการ"].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold text-foreground-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{data.unknownAds.map(ad => <MapRow key={ad.nameKey} ad={ad} onSaved={onChanged} />)}</tbody>
          </table>
        </div>
      )}
      {data.mappedAds.length > 0 && (
        <div className="border-t border-border p-4">
          <button onClick={() => setShowMapped(v => !v)} className="text-[11px] text-gold-400">
            {showMapped ? "ซ่อน" : "ดู"}ที่ผูกไว้แล้ว ({data.mappedAds.length})
          </button>
          {showMapped && (
            <ul className="mt-2 space-y-1">
              {data.mappedAds.map(m => (
                <li key={m.nameKey} className="flex items-center gap-2 text-xs">
                  <span className="text-foreground">{m.nameKey}</span>
                  <span className="text-foreground-muted">→ {m.exclude ? "ไม่ใช่แอดขาย" : `${m.service}${m.price ? ` ${m.price}` : ""}`}</span>
                  <button onClick={() => remove(m.nameKey)} className="text-[10px] text-rose-400 hover:underline">ลบ</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const pages = searchParams.get("pages") ?? "";
  const [range, setRange] = useState(() => {
    const end = new Date();
    return { start: new Date(end.getFullYear(), end.getMonth(), 1), end };
  });
  const [tab, setTab] = useState<"page" | "service" | "price">("page");
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const since = iso(range.start), until = iso(range.end);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    const qs = new URLSearchParams({ since, until });
    if (pages) qs.set("pages", pages);
    fetch(`/api/compare?${qs}`, { signal: ctrl.signal })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j; })
      .then(setData)
      .catch(e => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [since, until, pages, reloadKey]);

  const days = data ? { cur: data.ranges.cur.days, prev: data.ranges.prev.days } : { cur: 1, prev: 1 };
  const hasChat = !!data && (data.chatOverview.cur.chats > 0 || data.chatOverview.prev.chats > 0);
  const rows = data ? (tab === "page" ? data.byPage : tab === "service" ? data.byService : data.byPrice) : [];
  const ov = data?.overview;
  const co = data?.chatOverview;
  const hourMax = useMemo(() => Math.max(1, ...(data?.hours ?? []).map(h => h.chats)), [data]);
  const coverage = data ? Object.values(data.chatCoverage) : [];
  const syncing = coverage.filter(c => !c.complete).length;
  const tokenError = coverage.find(c => c.error)?.error;

  const kpis = ov && co ? [
    { label: "งบ/วัน", c: ov.cur.spend / days.cur, p: ov.prev.spend / days.prev, f: thb, b: "up" as Better },
    { label: "แชท/วัน", c: ov.cur.inbox / days.cur, p: ov.prev.inbox / days.prev, f: (n: number) => num(n, 1), b: "up" as Better },
    { label: "ลีด/วัน", c: ov.cur.leads / days.cur, p: ov.prev.leads / days.prev, f: (n: number) => num(n, 1), b: "up" as Better },
    { label: "฿/แชท", c: div(ov.cur.spend, ov.cur.inbox), p: div(ov.prev.spend, ov.prev.inbox), f: thb, b: "down" as Better },
    { label: "฿/ลีด", c: div(ov.cur.spend, ov.cur.leads), p: div(ov.prev.spend, ov.prev.leads), f: thb, b: "down" as Better },
    ...(hasChat ? [
      { label: "%ปิด (Pancake)", c: div(co.cur.closes, co.cur.chats), p: div(co.prev.closes, co.prev.chats), f: pct, b: "up" as Better },
      { label: "คิว/วัน", c: co.cur.queues / days.cur, p: co.prev.queues / days.prev, f: (n: number) => num(n, 1), b: "up" as Better },
      { label: "฿/ปิด", c: div(co.cur.chatSpend, co.cur.closes), p: div(co.prev.chatSpend, co.prev.closes), f: thb, b: "down" as Better },
    ] : []),
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ArrowRightLeft size={20} className="text-gold-400" /> เทียบเดือน</h1>
          <p className="text-xs text-foreground-muted mt-1">
            {data ? <>ช่วงนี้ {data.ranges.cur.since} → {data.ranges.cur.until} เทียบ {data.ranges.prev.since} → {data.ranges.prev.until} (วันที่เดียวกันของเดือนก่อน)</> : "เลือกช่วงวันที่"}
            {pages && " · เฉพาะเพจที่เลือกในแถบซ้าย"}
          </p>
        </div>
        <MarkTechDatePicker mode="range" value={range} onChange={(v: { start: Date; end: Date }) => v?.start && v?.end && setRange(v)} />
      </div>

      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300">{error}</div>}
      {loading && !data && <div className="flex items-center gap-2 text-foreground-muted text-sm"><Loader2 size={16} className="animate-spin" /> กำลังโหลด…</div>}

      {data && ov && co && (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          {(syncing > 0 || tokenError) && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                {syncing > 0 && `แชทจาก Pancake ยังดึงไม่ทัน ${syncing} เพจ (ดึงอัตโนมัติทุก 10 นาที) — เพจเหล่านี้ยังไม่ถูกนับใน %ปิด / คิว / ฿/ปิด `}
                {tokenError && `· ดึง Pancake มีปัญหา: ${tokenError}`}
              </span>
            </div>
          )}

          {(data.excluded.cur.spend > 0 || data.excluded.prev.spend > 0) && (
            <details className="mb-4 text-[11px] text-foreground-muted">
              <summary className="cursor-pointer">
                ไม่นับแคมเปญที่ไม่ใช่แอดขาย (Awareness/Engagement ที่แทบไม่มีแชท, สมัครงาน): ช่วงนี้ {thb(data.excluded.cur.spend)} · เดือนก่อน {thb(data.excluded.prev.spend)}
              </summary>
              <ul className="mt-2 ml-4 space-y-0.5">
                {data.excluded.campaigns.map(c => <li key={c.name}>{c.name} — {KIND_LABEL[c.kind] ?? c.kind} · {thb(c.spend)}</li>)}
              </ul>
            </details>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {kpis.map(k => (
              <div key={k.label} className="stat-card !py-3 !px-4">
                <p className="text-[10px] text-foreground-muted font-medium">{k.label}</p>
                <p className="text-lg font-bold text-foreground leading-tight">{k.f(k.c)}</p>
                <p className="text-[10px] text-foreground-muted">เดิม {k.f(k.p)} <Delta cur={k.c} prev={k.p} better={k.b} /></p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {data.decomposition.chats && <DecompCard title="แชทที่เปลี่ยนไปมาจากอะไร" unit="แชท" d={data.decomposition.chats} prevLabel="เดือนก่อน (ช่วงเดียวกัน)" />}
            {data.decomposition.closes && <DecompCard title="ปิดที่เปลี่ยนไปมาจากอะไร (Pancake)" unit="ห้อง" d={data.decomposition.closes} prevLabel="เดือนก่อน (ช่วงเดียวกัน)" />}
            {hasChat && (
              <div className="bg-navy-900 border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><MessageCircle size={14} className="text-gold-400" /> เหตุผลรอง (Pancake)</h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["ลูกค้าใหม่", pct(div(co.cur.newChats, co.cur.chats)), pct(div(co.prev.newChats, co.prev.chats))],
                    ["ปิดภายใน 1 ชม.", pct(div(co.cur.closes1h, co.cur.closes)), pct(div(co.prev.closes1h, co.prev.closes))],
                    ["ลีดค้าง (ให้เบอร์แล้วยังไม่ลงคิว)", num(co.cur.pending), num(co.prev.pending)],
                    ["เวลากลางกว่าจะปิด", data.medianMinutesToClose !== null ? `${num(data.medianMinutesToClose)} นาที` : "—", ""],
                  ].map(([l, c, p]) => (
                    <div key={l} className="flex justify-between gap-2"><span className="text-foreground-muted">{l}</span><span>{c}{p && <span className="text-foreground-muted"> (เดิม {p})</span>}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.flags.length > 0 && (
            <div className="bg-navy-900 border border-border rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-foreground mb-1">ข้อเสนอฝั่งแอด</h3>
              <p className="text-[10px] text-foreground-muted mb-3">เรียงตามผลต่อเงินมากสุด (สูงสุด 3 ข้อต่อเพจ{data.flagsTotal && data.flagsTotal > data.flags.length ? ` · แสดง ${data.flags.length} จาก ${data.flagsTotal} ข้อ` : ""}) · ปรับทีละ ±10% แล้วรอ 3–4 วันก่อนดูผล · ไม่ต้องปิดแอดถ้าไม่จำเป็น</p>
              <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {data.flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    {f.level === "warn" ? <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      : f.level === "good" ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      : <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />}
                    <span><span className="text-foreground-muted">{f.pageName}</span> · {f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center gap-1 p-3 border-b border-border">
              {([["page", "แยกเพจ"], ["service", "แยกบริการ"], ["price", "แยกราคา"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === k ? "bg-gold-500/15 text-gold-400 border border-gold-500/20" : "text-foreground-muted hover:bg-navy-800"}`}>
                  {l}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-foreground-muted">ตัวบน = ช่วงนี้ · ตัวล่าง = เดือนก่อน{tab === "price" ? " · แสดงเฉพาะแอดที่มีแชท ≥ 10" : ""}</span>
            </div>
            <Table rows={rows} days={days} kind={tab} showChat={hasChat} />
          </div>

          <ServiceMapping data={data} onChanged={() => setReloadKey(k => k + 1)} />

          {hasChat && data.hours.length > 0 && (
            <div className="bg-navy-900 border border-border rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-foreground mb-1">แชทเข้าตามชั่วโมง และปิดภายใน 1 ชม.</h3>
              <p className="text-[10px] text-foreground-muted mb-4">ใช้ตั้งเวลาแอดให้ตรงช่วงที่แอดมินตอบและปิดได้เร็ว (เฉพาะเพจที่อ่านจาก Pancake)</p>
              <div className="flex items-end gap-1 h-36">
                {Array.from({ length: 24 }, (_, h) => data.hours.find(x => x.hour === h) ?? { hour: h, chats: 0, closes: 0, closes1h: 0 }).map(h => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${h.hour}:00 แชท ${h.chats} · ปิด ${h.closes} · ปิดใน 1 ชม. ${h.closes1h} (${pct(div(h.closes1h, h.chats))})`}>
                    <div className="w-full flex flex-col justify-end h-28">
                      <div className="w-full bg-gold-500/60 rounded-t" style={{ height: `${(h.chats / hourMax) * 100}%` }}>
                        <div className="w-full bg-emerald-400/80 rounded-t" style={{ height: `${h.chats ? (h.closes1h / h.chats) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <span className="text-[8px] text-foreground-muted">{h.hour}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-[10px] text-foreground-muted">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gold-500/60 rounded-sm" /> แชท</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-400/80 rounded-sm" /> ปิดภายใน 1 ชม.</span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-foreground-muted space-y-1 bg-navy-900/50 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground-muted">ข้อจำกัด</p>
            <p>• แชท/ลีด/งบ มาจาก Meta · &quot;ปิด&quot; และ &quot;คิว&quot; นับจากข้อความในแชท Pancake (บรรทัดสรุปคิว การโอน หรือให้เบอร์แล้วแอดมินลงคิว) ยังไม่ได้เทียบกับยอดในระบบหน้าร้าน</p>
            <p>• &quot;ลีด&quot; ของ Meta คือ lead event ไม่ใช่คิว และบางเพจไม่ได้ตั้งการติดลีด · เพจที่ไม่อยู่ใน Pancake จะไม่มีตัวเลขปิด</p>
            <p>• บริการ/ราคา อ่านจากชื่อแอด ชื่อแคมเปญ หรือข้อความในแอด ถ้าไม่เจอจะอยู่ใน &quot;ไม่ระบุบริการ&quot; (ผูกเองได้ด้านบน) · บางห้องไม่มีรหัสแอด (นับเป็น &quot;ไม่มีแอด&quot;)</p>
            <p>• แคมเปญ Lead นับแชทตามปกติ แต่ข้อเสนอดูที่ ฿/ลีด เพราะแคมเปญ opt หาคนให้ลีด · ไม่นับแคมเปญ Awareness/Engagement ที่แทบไม่มีแชท และแคมเปญสมัครงาน</p>
            <p>• ช่วงนี้ที่ยังไม่จบเดือนคิดค่าเฉลี่ยต่อวันถึงวันนี้ · การคาดการณ์ใช้ประสิทธิภาพเดือนก่อน เป็นค่าประมาณ</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-foreground-muted text-sm">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
