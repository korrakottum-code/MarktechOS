"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Plus, Search, Check, Loader2, AlertCircle, Trash2, Pencil,
  DollarSign, MessageCircle, Users as UsersIcon, X,
} from "lucide-react";

interface PageOption {
  pageId: string;
  pageName: string;
}

interface ReportSet {
  id: string;
  name: string;
  pageIds: string[];
  pageNames: string[];
  overview: { spend: number; inbox: number; leads: number; impressions: number; since: string; until: string };
}

function fmtCurrency(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function fmtNames(names: string[]) {
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} และอีก ${names.length - 2} เพจ`;
}

export default function ReportSetGallery({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [sets, setSets] = useState<ReportSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allPages, setAllPages] = useState<PageOption[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPageIds, setNewPageIds] = useState<Set<string>>(new Set());
  const [pageSearch, setPageSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // While the panel is open (creating or editing), other cards' edit/delete
  // controls are disabled — switching targets mid-edit silently discarded
  // whatever was in progress, with no warning.
  const cardActionsLocked = creating || deletingId !== null;

  const loadSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report-sets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSets(data.sets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        setAllPages(data.pages || []);
      }
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSets();
    loadAllPages();
  }, [loadSets, loadAllPages]);

  function openSet(pageIds: string[]) {
    const params = new URLSearchParams();
    params.set("pages", pageIds.join(","));
    router.push(`/?${params.toString()}`);
  }

  function viewAll() {
    if (allPages.length === 0) return; // still loading, or genuinely no pages yet
    openSet(allPages.map(p => p.pageId));
  }

  async function deleteSet(set: ReportSet, e: React.MouseEvent) {
    e.stopPropagation();
    if (cardActionsLocked) return;
    if (!confirm(`ลบชุด "${set.name}"?`)) return;
    setDeletingId(set.id);
    try {
      const res = await fetch(`/api/report-sets?id=${set.id}`, { method: "DELETE" });
      if (res.ok) {
        // If this set's edit panel happened to be open, close it — its id no
        // longer exists, so saving afterward would just fail.
        if (editingId === set.id) closeCreatePanel();
        loadSets();
      }
    } finally {
      setDeletingId(null);
    }
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setNewName("");
    setNewPageIds(new Set());
    setPageSearch("");
    setShowSelectedOnly(false);
  }

  function startEdit(set: ReportSet, e: React.MouseEvent) {
    e.stopPropagation();
    if (cardActionsLocked) return;
    setCreating(true);
    setEditingId(set.id);
    setNewName(set.name);
    setNewPageIds(new Set(set.pageIds));
    setPageSearch("");
    setShowSelectedOnly(true); // editing — show what's already in the set first
  }

  function closeCreatePanel() {
    setCreating(false);
    setEditingId(null);
    setNewName("");
    setNewPageIds(new Set());
    setShowSelectedOnly(false);
    setPageSearch("");
  }

  async function saveNewSet() {
    if (!newName.trim() || newPageIds.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/report-sets", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: newName.trim(), pageIds: [...newPageIds] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      closeCreatePanel();
      loadSets();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function togglePage(id: string) {
    setNewPageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filteredPages = allPages.filter(p =>
    (!showSelectedOnly || newPageIds.has(p.pageId)) &&
    p.pageName.toLowerCase().includes(pageSearch.toLowerCase())
  );

  return (
    <div className="py-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center border border-gold-500/20">
            <LayoutGrid size={20} className="text-gold-text" />
          </div>
          เลือกชุดที่ต้องการดู
        </h1>
        <p className="text-sm text-foreground-muted mt-1">แต่ละชุดคือกลุ่มเพจที่บันทึกไว้ พร้อมภาพรวม 7 วันล่าสุด</p>
      </div>

      {/* View all */}
      <button type="button" onClick={viewAll} disabled={allPages.length === 0}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-br from-gold-500/10 to-gold-600/5 border border-gold-500/25 hover:border-gold-500/50 transition-colors text-left group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gold-500/25"
      >
        <div>
          <p className="text-sm font-bold text-gold-text">ดูภาพรวมทุกสาขา</p>
          <p className="text-xs text-foreground-muted mt-0.5">{allPages.length} เพจทั้งหมด</p>
        </div>
        <span className="text-gold-text opacity-0 group-hover:opacity-100 transition-opacity text-sm">เปิดดู →</span>
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-foreground-muted text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลดชุดที่บันทึกไว้...
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map(set => (
            <button key={set.id} type="button" onClick={() => openSet(set.pageIds)} disabled={cardActionsLocked}
              className={`text-left p-5 rounded-2xl bg-surface/50 border transition-colors space-y-3 group relative disabled:cursor-not-allowed ${
                editingId === set.id ? "border-gold-500/50" : "border-border hover:border-gold-500/40"
              }`}
            >
              {canManage && (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button type="button" onClick={(e) => startEdit(set, e)} disabled={cardActionsLocked}
                    className="p-1.5 rounded-lg text-foreground-muted hover:bg-gold-500/15 hover:text-gold-text disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Pencil size={13} />
                  </button>
                  <button type="button" onClick={(e) => deleteSet(set, e)} disabled={cardActionsLocked}
                    className="p-1.5 rounded-lg text-foreground-muted hover:bg-red-500/15 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {deletingId === set.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              )}
              <div>
                <p className="font-bold text-foreground pr-12">{set.name}</p>
                <p className="text-xs text-foreground-muted mt-0.5">{fmtNames(set.pageNames)}</p>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-xs">
                <span className="flex items-center gap-1.5 text-foreground-muted">
                  <DollarSign size={12} className="text-emerald-400" /> {fmtCurrency(set.overview.spend)}
                </span>
                <span className="flex items-center gap-1.5 text-foreground-muted">
                  <MessageCircle size={12} className="text-blue-400" /> {set.overview.inbox.toLocaleString("th-TH")}
                </span>
                <span className="flex items-center gap-1.5 text-foreground-muted">
                  <UsersIcon size={12} className="text-purple-400" /> {set.overview.leads.toLocaleString("th-TH")}
                </span>
              </div>
              <p className="text-[10px] text-foreground-muted/60">7 วันล่าสุด</p>
            </button>
          ))}

          {canManage && !creating && (
            <button type="button" onClick={startCreate} disabled={deletingId !== null}
              title={deletingId !== null ? "รอลบชุดเดิมให้เสร็จก่อน" : undefined}
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-dashed border-border hover:border-gold-500/50 text-foreground-muted hover:text-gold-text transition-colors min-h-[140px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">สร้างชุดใหม่</span>
            </button>
          )}
        </div>
      )}

      {sets.length === 0 && !loading && !error && !creating && (
        <p className="text-center text-sm text-foreground-muted py-4">ยังไม่มีชุดที่บันทึกไว้{canManage ? " — กด \"สร้างชุดใหม่\" เพื่อเริ่มต้น" : ""}</p>
      )}

      {/* Create set panel */}
      {creating && (
        <div className="p-5 rounded-2xl bg-surface/50 border border-gold-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">{editingId ? "แก้ไขชุด" : "สร้างชุดใหม่"}</h2>
            <button type="button" onClick={closeCreatePanel}
              className="p-1 rounded-lg hover:bg-surface-hover text-foreground-muted">
              <X size={16} />
            </button>
          </div>

          <div>
            <input
              type="text" placeholder="ตั้งชื่อชุด เช่น ภาคเหนือ, ลูกค้า VIP..."
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50"
            />
            {newName.length > 0 && !newName.trim() && (
              <p className="text-[11px] text-red-400 mt-1">ชื่อชุดต้องไม่เป็นช่องว่างล้วน</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-foreground-muted" />
              <input
                type="text" placeholder="ค้นหาเพจ..."
                value={pageSearch} onChange={e => setPageSearch(e.target.value)}
                className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50"
              />
            </div>
            <button type="button" onClick={() => setShowSelectedOnly(v => !v)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                showSelectedOnly ? "bg-gold-500/15 text-gold-text border-gold-500/30" : "text-foreground-muted border-border hover:border-gold-500/50"
              }`}
            >
              เลือกแล้ว {newPageIds.size}
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-background/30">
            {pagesLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-foreground-muted">
                <Loader2 size={12} className="animate-spin" /> กำลังโหลดรายชื่อเพจ...
              </div>
            ) : filteredPages.length === 0 ? (
              <p className="text-center py-4 text-xs text-foreground-muted">
                {showSelectedOnly && newPageIds.size === 0 ? "ยังไม่ได้เลือกเพจ" : "ไม่พบเพจ"}
              </p>
            ) : (
              filteredPages.map(page => {
                const selected = newPageIds.has(page.pageId);
                return (
                  <button key={page.pageId} type="button" onClick={() => togglePage(page.pageId)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                      selected ? "bg-gold-500/10 text-foreground border border-gold-500/20" : "text-foreground-muted hover:bg-surface-hover border border-transparent"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-gold-500 border-gold-500" : "border-border"}`}>
                      {selected && <Check size={10} className="text-navy-950" />}
                    </div>
                    <span className="truncate text-left">{page.pageName}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-foreground-muted">เลือกแล้ว {newPageIds.size} เพจ</span>
            <button type="button" onClick={saveNewSet} disabled={saving || !newName.trim() || newPageIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 rounded-xl text-xs font-bold hover:from-gold-300 hover:to-gold-500 transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {editingId ? "บันทึกการแก้ไข" : "บันทึกชุด"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
