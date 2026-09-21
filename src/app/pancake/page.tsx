"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, MessageCircle } from "lucide-react";
import { todayBangkokDateStr } from "@/lib/pancake";

interface PageStat {
  pageId: string;
  name: string;
  conversationsFetched: number;
  withCustomerMsg: number;
  noStaffSeenYet: number;
  sampleWithGap: number;
  medianMinutes: number | null;
  avgMinutes: number | null;
  oldestConversationAt: string | null;
  coverageIncomplete: boolean;
  error?: string;
}

function fmtMin(v: number | null) {
  return v === null ? "-" : v.toFixed(1);
}

// สีไล่ตามความช้า — median ยิ่งมาก ยิ่งแดง (เกณฑ์คร่าวๆ จากข้อมูลจริงที่เจอ ไม่ใช่ SLA ทางการ)
function medianColor(v: number | null) {
  if (v === null) return "text-gray-400";
  if (v >= 10) return "text-rose-400";
  if (v >= 3) return "text-amber-400";
  return "text-emerald-400";
}

const TODAY = todayBangkokDateStr();

/** เลื่อนวันที่ (YYYY-MM-DD) ไป N วัน — คำนวณเป็นวันปฏิทินล้วนๆ ไม่ต้องยุ่งกับ timezone instant เพราะ TODAY มาจาก Bangkok อยู่แล้ว */
function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

function firstOfMonthStr(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `${y}-${m}-01`;
}

type Range = { since: string; until: string };

function thisMonthRange(): Range {
  return { since: firstOfMonthStr(TODAY), until: TODAY };
}

function lastMonthRange(): Range {
  const lastDayOfPrevMonth = shiftDateStr(firstOfMonthStr(TODAY), -1);
  return { since: firstOfMonthStr(lastDayOfPrevMonth), until: lastDayOfPrevMonth };
}

const QUICK_PRESETS: Array<{ label: string; range: () => Range }> = [
  { label: "วันนี้", range: () => ({ since: TODAY, until: TODAY }) },
  { label: "เมื่อวาน", range: () => ({ since: shiftDateStr(TODAY, -1), until: shiftDateStr(TODAY, -1) }) },
  { label: "7 วันล่าสุด", range: () => ({ since: shiftDateStr(TODAY, -6), until: TODAY }) },
  { label: "เดือนนี้", range: thisMonthRange },
  { label: "เดือนที่แล้ว", range: lastMonthRange },
];

function sameRange(a: Range, b: Range) {
  return a.since === b.since && a.until === b.until;
}

export default function PancakeResponseTimePage() {
  const [range, setRange] = useState<Range>({ since: TODAY, until: TODAY });
  const [pages, setPages] = useState<PageStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // แก้ since/until ทีละช่อง ทำให้ useEffect ยิง fetch ซ้อนกัน 2 ครั้งได้ — ถ้าคำขอเก่าตอบกลับ
  // ช้ากว่าคำขอใหม่ ต้องไม่ให้ผลลัพธ์เก่า (รวมถึง error จากช่วงวันที่ผ่านๆ ที่ยังกรอกไม่ครบ) มาทับของใหม่
  const latestRequestId = useRef(0);

  const load = useCallback(async (forRange: Range, forceRefresh = false) => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/pancake?since=${forRange.since}&until=${forRange.until}${forceRefresh ? "&refresh=1" : ""}`
      );
      const data = await res.json();
      if (requestId !== latestRequestId.current) return;
      if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
      setPages(data.pages || []);
      setFetchedAt(data.fetchedAt || null);
      if (data.message) setMessage(data.message);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  const totalWithMsg = pages.reduce((s, p) => s + p.withCustomerMsg, 0);
  const totalNoSeen = pages.reduce((s, p) => s + p.noStaffSeenYet, 0);
  const anyIncomplete = pages.some((p) => p.coverageIncomplete);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              เวลาตอบแชท — Pancake
            </h1>
            {fetchedAt && (
              <p className="text-xs text-gray-400 mt-1">
                ดึงเมื่อ {new Date(fetchedAt).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
              </p>
            )}
          </div>
          <button
            onClick={() => load(range, true)}
            disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">รีเฟรช</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
            {QUICK_PRESETS.map((p) => {
              const value = p.range();
              return (
                <button
                  key={p.label}
                  onClick={() => setRange(value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    sameRange(range, value) ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={range.since}
              max={range.until}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, since: e.target.value }))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs sm:text-sm text-gray-200 [color-scheme:dark]"
            />
            <span className="text-gray-500 text-xs">ถึง</span>
            <input
              type="date"
              value={range.until}
              min={range.since}
              max={TODAY}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, until: e.target.value }))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs sm:text-sm text-gray-200 [color-scheme:dark]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {!error && message && (
          <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 text-sm">
            {message}
          </div>
        )}

        {!error && pages.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 mb-2">
            รวม {pages.length} เพจ · บทสนทนาที่ลูกค้าทักมา {totalWithMsg.toLocaleString("th-TH")} ·
            ยังไม่มีแอดมินเปิดดูเลย {totalNoSeen.toLocaleString("th-TH")}
            {totalWithMsg > 0 && ` (${((totalNoSeen / totalWithMsg) * 100).toFixed(1)}%)`}
          </p>
        )}

        {!error && anyIncomplete && (
          <div className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            ⚠️ ช่วงวันที่เลือกย้อนไกลกว่าข้อมูลที่ดึงมาได้สำหรับบางเพจ (Pancake ให้ดึงได้แค่ &ldquo;บทสนทนาล่าสุด&rdquo; ไม่ใช่ตามช่วงวันที่)
            ตัวเลขของเพจที่ขึ้น <span className="text-amber-200 font-medium">*</span> อาจนับไม่ครบทั้งช่วง
          </div>
        )}

        {/* Mobile: การ์ดแนวตั้ง ไม่ต้องเลื่อนขวา */}
        <div className="sm:hidden space-y-2">
          {pages.map((p) => (
            <div key={p.pageId} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">
                  {p.name}
                  {p.coverageIncomplete && <span className="text-amber-400">*</span>}
                </p>
                <div className={`text-lg font-bold ${medianColor(p.medianMinutes)} flex-shrink-0`}>
                  {fmtMin(p.medianMinutes)}
                  <span className="text-[10px] font-normal text-gray-500 ml-1">นาที</span>
                </div>
              </div>
              {p.error ? (
                <p className="text-[11px] text-rose-400 mt-1">{p.error}</p>
              ) : (
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                  <span>บทสนทนา {p.withCustomerMsg}</span>
                  <span>ไม่มีคนดู {p.noStaffSeenYet}</span>
                  <span>avg {fmtMin(p.avgMinutes)} นาที</span>
                </div>
              )}
            </div>
          ))}
          {!loading && pages.length === 0 && !error && !message && (
            <p className="py-8 text-center text-gray-500 text-sm">ไม่มีข้อมูล</p>
          )}
        </div>

        {/* Desktop/tablet: ตาราง */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-left py-2.5 px-3 font-medium">สาขา</th>
                <th className="text-right py-2.5 px-3 font-medium">บทสนทนา</th>
                <th className="text-right py-2.5 px-3 font-medium">ยังไม่มีคนดู</th>
                <th className="text-right py-2.5 px-3 font-medium">median (นาที)</th>
                <th className="text-right py-2.5 px-3 font-medium">avg (นาที)</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.pageId} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-2 px-3">
                    {p.name}
                    {p.coverageIncomplete && <span className="text-amber-400">*</span>}
                    {p.error && <span className="ml-2 text-[10px] text-rose-400">({p.error})</span>}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-300">{p.withCustomerMsg}</td>
                  <td className="py-2 px-3 text-right text-gray-300">{p.noStaffSeenYet}</td>
                  <td className={`py-2 px-3 text-right font-semibold ${medianColor(p.medianMinutes)}`}>
                    {fmtMin(p.medianMinutes)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-300">{fmtMin(p.avgMinutes)}</td>
                </tr>
              ))}
              {!loading && pages.length === 0 && !error && !message && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
