"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Search, Check, Loader2, AlertCircle, CheckCircle2, XCircle,
  Bookmark, Trash2, PlayCircle,
} from "lucide-react";

interface AdAccount {
  accountId: string;
  name: string;
}

interface ReportSet {
  id: string;
  name: string;
  accountIds: string[];
}

interface SyncAccountResult {
  name: string;
  rows: number;
  status: "✅" | "❌";
  error?: string;
}

interface SyncResult {
  message: string;
  since: string;
  until: string;
  results: SyncAccountResult[];
}

interface SyncRun {
  id: string;
  since: string;
  until: string;
  status: string;
  accountsTotal: number;
  accountsFailed: number;
  campaignRows: number;
  contentRows: number;
  error: string;
  startedAt: string;
  completedAt: string | null;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function datePreset(kind: "last3" | "thisMonth" | "lastMonth"): { since: string; until: string } {
  const now = new Date();
  if (kind === "last3") {
    const start = new Date(now.getTime() - 3 * 86400000);
    return { since: toISO(start), until: toISO(now) };
  }
  if (kind === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { since: toISO(start), until: toISO(now) };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { since: toISO(start), until: toISO(end) };
}

export default function SyncTab() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [reportSets, setReportSets] = useState<ReportSet[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);

  const [mode, setMode] = useState<"all" | "custom">("custom");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState("");

  const preset3 = datePreset("last3");
  const [since, setSince] = useState(preset3.since);
  const [until, setUntil] = useState(preset3.until);

  const [newSetName, setNewSetName] = useState("");
  const [savingSet, setSavingSet] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch("/api/admin/ad-accounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAccounts(data.accounts || []);
    } catch (e) {
      setAccountsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadReportSets = useCallback(async () => {
    const res = await fetch("/api/admin/report-sets");
    if (res.ok) {
      const data = await res.json();
      setReportSets(data.sets || []);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/admin/sync-runs");
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs || []);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadReportSets();
    loadRuns();
  }, [loadAccounts, loadReportSets, loadRuns]);

  function toggleAccount(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function applySet(set: ReportSet) {
    setMode("custom");
    setSelected(new Set(set.accountIds));
    setNewSetName(set.name);
  }

  async function deleteSet(id: string) {
    if (!confirm("ลบชุดบัญชีนี้?")) return;
    const res = await fetch(`/api/admin/report-sets?id=${id}`, { method: "DELETE" });
    if (res.ok) loadReportSets();
  }

  async function saveAsSet() {
    if (!newSetName.trim() || selected.size === 0) return;
    setSavingSet(true);
    try {
      const res = await fetch("/api/admin/report-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSetName.trim(), accountIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      loadReportSets();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingSet(false);
    }
  }

  const rangeDays = useMemo(() => {
    if (!since || !until) return 0;
    return Math.floor((Date.parse(until) - Date.parse(since)) / 86400000) + 1;
  }, [since, until]);

  async function runSync() {
    setSyncError(null);
    setSyncResult(null);

    if (!since || !until || since > until) {
      setSyncError("ช่วงวันที่ไม่ถูกต้อง");
      return;
    }
    if (rangeDays > 31) {
      setSyncError("Sync ได้ครั้งละไม่เกิน 31 วัน");
      return;
    }
    if (mode === "custom" && selected.size === 0) {
      setSyncError("กรุณาเลือกอย่างน้อย 1 บัญชี หรือเปลี่ยนเป็น \"ทั้งหมด\"");
      return;
    }

    setSyncing(true);
    try {
      const params = new URLSearchParams({ since, until });
      if (mode === "custom") params.set("accounts", [...selected].join(","));
      const res = await fetch(`/api/cron/sync-ads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSyncResult(data);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
      loadRuns();
    }
  }

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase()) || a.accountId.includes(accountSearch)
  );

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="bg-surface/50 border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">ช่วงวันที่</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date" value={since} onChange={e => setSince(e.target.value)}
            className="bg-background/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold-500/50"
          />
          <span className="text-foreground-muted text-sm">ถึง</span>
          <input
            type="date" value={until} onChange={e => setUntil(e.target.value)}
            className="bg-background/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold-500/50"
          />
          <div className="flex gap-1.5 ml-auto">
            {([
              ["last3", "3 วันล่าสุด"],
              ["thisMonth", "เดือนนี้"],
              ["lastMonth", "เดือนที่แล้ว"],
            ] as const).map(([kind, label]) => (
              <button key={kind} type="button"
                onClick={() => { const p = datePreset(kind); setSince(p.since); setUntil(p.until); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-muted border border-border hover:border-gold-500/50 hover:text-gold-text transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {rangeDays > 31 && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={12} /> ช่วงที่เลือก {rangeDays} วัน — sync ได้ครั้งละไม่เกิน 31 วัน
          </p>
        )}
      </div>

      {/* Account selection */}
      <div className="bg-surface/50 border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">บัญชีที่จะดึงข้อมูล</h2>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                mode === "all" ? "bg-gold-500/15 text-gold-text border-gold-500/30" : "text-foreground-muted border-border hover:border-gold-500/50"
              }`}>
              ทั้งหมด ({accounts.length})
            </button>
            <button type="button" onClick={() => setMode("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                mode === "custom" ? "bg-gold-500/15 text-gold-text border-gold-500/30" : "text-foreground-muted border-border hover:border-gold-500/50"
              }`}>
              เลือกเฉพาะ ({selected.size})
            </button>
          </div>
        </div>

        {/* Saved report sets */}
        {reportSets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reportSets.map(set => (
              <div key={set.id} className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs">
                <button type="button" onClick={() => applySet(set)} className="text-blue-400 font-medium hover:text-blue-300">
                  <Bookmark size={10} className="inline mr-1 -mt-0.5" />{set.name} ({set.accountIds.length})
                </button>
                <button type="button" onClick={() => deleteSet(set.id)} className="p-1 rounded-full hover:bg-red-500/15 text-foreground-muted hover:text-red-400">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {mode === "custom" && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-foreground-muted" />
              <input
                type="text" placeholder="ค้นหาบัญชี..."
                value={accountSearch} onChange={e => setAccountSearch(e.target.value)}
                className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setSelected(new Set(filteredAccounts.map(a => a.accountId)))}
                className="text-[10px] text-gold-text hover:text-gold-text-hover font-medium">
                เลือกทั้งหมด
              </button>
              <span className="text-[9px] text-foreground-muted">|</span>
              <button type="button" onClick={() => setSelected(new Set())}
                className="text-[10px] text-gold-text hover:text-gold-text-hover font-medium">
                ยกเลิกทั้งหมด
              </button>
            </div>

            {accountsLoading ? (
              <div className="flex items-center justify-center py-8 text-foreground-muted text-xs gap-2">
                <Loader2 size={14} className="animate-spin" /> กำลังโหลดรายชื่อบัญชีจาก Meta...
              </div>
            ) : accountsError ? (
              <div className="flex items-center gap-2 text-xs text-red-400 py-4">
                <AlertCircle size={12} /> {accountsError}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-background/30">
                {filteredAccounts.map(acc => {
                  const isSelected = selected.has(acc.accountId);
                  return (
                    <button
                      key={acc.accountId} type="button"
                      onClick={() => toggleAccount(acc.accountId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSelected ? "bg-gold-500/10 text-foreground border border-gold-500/20" : "text-foreground-muted hover:bg-surface-hover border border-transparent"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-gold-500 border-gold-500" : "border-border"
                      }`}>
                        {isSelected && <Check size={10} className="text-navy-950" />}
                      </div>
                      <span className="truncate text-left">{acc.name}</span>
                    </button>
                  );
                })}
                {filteredAccounts.length === 0 && (
                  <p className="text-center py-4 text-xs text-foreground-muted">ไม่พบบัญชี</p>
                )}
              </div>
            )}

            {/* Save as set */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text" placeholder="ตั้งชื่อชุดบัญชี แล้วบันทึกไว้ใช้ซ้ำ..."
                value={newSetName} onChange={e => setNewSetName(e.target.value)}
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50"
              />
              <button type="button" onClick={saveAsSet}
                disabled={savingSet || !newSetName.trim() || selected.size === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gold-text border border-gold-500/30 hover:bg-gold-500/10 disabled:opacity-40 transition-colors">
                {savingSet ? <Loader2 size={12} className="animate-spin" /> : <Bookmark size={12} />}
                บันทึกเป็นชุดบัญชี
              </button>
            </div>
          </>
        )}
      </div>

      {/* Run sync */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={runSync} disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 rounded-xl text-sm font-bold hover:from-gold-300 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 active:scale-[0.97] disabled:opacity-60">
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
          {syncing ? "กำลัง Sync..." : "เริ่ม Sync"}
        </button>
        {syncing && <span className="text-xs text-foreground-muted">อาจใช้เวลา 1–5 นาที ขึ้นอยู่กับจำนวนบัญชีและช่วงวันที่</span>}
      </div>

      {syncError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <XCircle size={16} /> {syncError}
        </div>
      )}

      {syncResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle2 size={16} /> {syncResult.message}
          </div>
          {Array.isArray(syncResult.results) && syncResult.results.some(r => r.status === "❌") && (
            <div className="text-xs text-foreground-muted px-1">
              บัญชีที่ล้มเหลว:{" "}
              {syncResult.results.filter(r => r.status === "❌").map(r => r.name).join(", ")}
              {" — ลองกด Sync ซ้ำอีกครั้งเพื่อดึงส่วนที่เหลือ"}
            </div>
          )}
        </div>
      )}

      {/* Recent runs */}
      <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">ประวัติ Sync ล่าสุด</h2>
          <button type="button" onClick={loadRuns} className="p-1.5 rounded-lg hover:bg-surface-hover text-foreground-muted">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-bold text-foreground-muted uppercase tracking-wider">ช่วงวันที่</th>
                <th className="text-left px-4 py-2 font-bold text-foreground-muted uppercase tracking-wider">สถานะ</th>
                <th className="text-left px-4 py-2 font-bold text-foreground-muted uppercase tracking-wider">บัญชี</th>
                <th className="text-left px-4 py-2 font-bold text-foreground-muted uppercase tracking-wider">แถวข้อมูล</th>
                <th className="text-left px-4 py-2 font-bold text-foreground-muted uppercase tracking-wider">เริ่มเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-foreground">{run.since} → {run.until}</td>
                  <td className="px-4 py-2">
                    {run.status === "completed" ? (
                      <span className="text-emerald-400 font-medium">สำเร็จ</span>
                    ) : run.status === "failed" ? (
                      <span className="text-red-400 font-medium" title={run.error}>ล้มเหลว</span>
                    ) : (
                      <span className="text-amber-400 font-medium">กำลังทำงาน</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground-muted">
                    {run.accountsTotal - run.accountsFailed}/{run.accountsTotal}
                    {run.accountsFailed > 0 && <span className="text-red-400"> ({run.accountsFailed} fail)</span>}
                  </td>
                  <td className="px-4 py-2 text-foreground-muted">{run.campaignRows} / {run.contentRows}</td>
                  <td className="px-4 py-2 text-foreground-muted">
                    {new Date(run.startedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-foreground-muted">ไม่มีประวัติ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
