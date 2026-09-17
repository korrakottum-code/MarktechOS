"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Check, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface PancakePageOption {
  id: string;
  name: string;
  platform: string;
}

interface TrackedPage {
  pageId: string;
  name: string;
}

export default function PancakeTab() {
  const [available, setAvailable] = useState<PancakePageOption[]>([]);
  const [tracked, setTracked] = useState<TrackedPage[]>([]);
  const [selected, setSelected] = useState<Map<string, string>>(new Map()); // pageId -> name
  const [loading, setLoading] = useState(true);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/pancake-pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAvailable(data.available || []);
      setTracked(data.tracked || []);
      setTokenMissing(!!data.tokenMissing);
      setSelected(new Map((data.tracked || []).map((t: TrackedPage) => [t.pageId, t.name])));
      if (data.error) setLoadError(data.error);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // เพจที่แอดมิน track ไว้แต่ตอนนี้ไม่โผล่ในรายการ live จาก Pancake (ปิดเพจ/token คนละสิทธิ์) — ยังต้องแสดงให้เลือกลบได้
  const missingTracked = useMemo(
    () => tracked.filter((t) => !available.some((p) => p.id === t.pageId)),
    [tracked, available]
  );

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((p) => p.name.toLowerCase().includes(q));
  }, [available, search]);

  function toggle(pageId: string, name: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.set(pageId, name);
      return next;
    });
  }

  const hasChanges =
    selected.size !== tracked.length || tracked.some((t) => selected.get(t.pageId) !== t.name);

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSuccessMsg(null);
    try {
      const pages = [...selected.entries()].map(([pageId, name]) => ({ pageId, name }));
      const res = await fetch("/api/admin/pancake-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTracked(data.tracked || []);
      setSuccessMsg("บันทึกแล้ว");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={28} className="text-gold-400 animate-spin" />
        <p className="text-sm text-foreground-muted">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-foreground-muted">
          เลือกเพจที่จะแสดงบนหน้า{" "}
          <a
            href="/pancake"
            target="_blank"
            rel="noreferrer"
            className="text-gold-400 hover:underline inline-flex items-center gap-1"
          >
            /pancake <ExternalLink size={12} />
          </a>{" "}
          (สาธารณะ ไม่ต้อง login)
        </p>
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 rounded-xl text-sm font-bold hover:from-gold-300 hover:to-gold-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          บันทึก ({selected.size} เพจ)
        </button>
      </div>

      {successMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {saveError}
        </div>
      )}
      {tokenMissing && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle size={16} /> ยังไม่ได้ตั้งค่า PANCAKE_ACCESS_TOKEN — ไม่เห็นรายชื่อเพจจาก Pancake สด แต่ยังลบเพจที่เคย track ไว้ได้
        </div>
      )}
      {loadError && !tokenMissing && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {loadError}
        </div>
      )}

      {missingTracked.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
          <p className="text-xs font-medium text-amber-400">Track ไว้แต่ไม่เจอในรายการ live จาก Pancake:</p>
          {missingTracked.map((t) => (
            <label key={t.pageId} className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(t.pageId)}
                onChange={() => toggle(t.pageId, t.name)}
                className="rounded"
              />
              {t.name} <span className="text-xs text-foreground-muted/60">({t.pageId})</span>
            </label>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเพจ..."
          className="w-full pl-9 pr-3 py-2 bg-background-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </div>

      <div className="rounded-xl border border-border divide-y divide-border max-h-[28rem] overflow-y-auto">
        {filteredAvailable.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-background-secondary/60 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id, p.name)}
              className="rounded"
            />
            <span className="flex-1">{p.name}</span>
            <span className="text-xs text-foreground-muted/60">{p.platform}</span>
          </label>
        ))}
        {filteredAvailable.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-foreground-muted">ไม่พบเพจ</p>
        )}
      </div>
    </div>
  );
}
