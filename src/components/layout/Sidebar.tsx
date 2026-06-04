"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, LayoutDashboard, Monitor, Search, CheckSquare, Square } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";
import { canAccessPath } from "@/lib/auth/permissions";

interface PageData {
  pageId: string;
  pageName: string;
}
interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthSession();
  const [pages, setPages] = useState<PageData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const urlPages = searchParams.get("pages");
  const selectedPages = new Set(urlPages ? urlPages.split(",") : []);

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch("/api/pages");
        if (res.ok) {
          const data = await res.json();
          setPages(data.pages || []);
        }
      } catch (err) {
        console.error("Failed to fetch pages for sidebar", err);
      }
    }
    fetchPages();
  }, []);

  function togglePage(pageId: string) {
    const next = new Set(selectedPages);
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    
    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("pages", Array.from(next).join(","));
    else params.delete("pages");
    
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  function clearPages() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pages");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  function selectAll() {
    const next = new Set(selectedPages);
    const allFilteredIds = filteredPages.map(p => p.pageId);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => next.has(id));

    if (areAllSelected) {
      allFilteredIds.forEach(id => next.delete(id));
    } else {
      allFilteredIds.forEach(id => next.add(id));
    }

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("pages", Array.from(next).join(","));
    else params.delete("pages");
    
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  const filteredPages = pages.filter(p => p.pageName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-in-out bg-navy-950 border-r border-border ${
        collapsed ? "lg:w-20" : "lg:w-64"
      } ${
        mobileOpen
          ? "translate-x-0 w-64"
          : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 5v14l11-7L8 5z"
              fill="#0d1520"
              stroke="#0d1520"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="animate-fade-in flex-1">
            <h1 className="text-sm font-bold text-gold-gradient tracking-wide">
              MARKTECH OS
            </h1>
            <p className="text-[10px] text-foreground-muted -mt-0.5">
              Data-Driven Platform
            </p>
          </div>
        )}
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded-lg hover:bg-navy-800 text-foreground-muted"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation & Filters */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 flex flex-col">
        {/* Global Dashboard Link (Clears filters) */}
        <button
          onClick={() => {
            clearPages();
            if (mobileOpen) onCloseMobile();
          }}
          className={`w-full relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
            (!collapsed || mobileOpen) ? "" : "justify-center"
          } ${
            pathname === "/" && selectedPages.size === 0
              ? "bg-gradient-to-r from-gold-500/15 to-transparent text-gold-400 border border-gold-500/20"
              : "text-foreground-muted hover:bg-navy-800 hover:text-foreground"
          }`}
          title={collapsed && !mobileOpen ? "ภาพรวมทั้งหมด" : undefined}
        >
          <LayoutDashboard size={20} className={`shrink-0 ${pathname === "/" && selectedPages.size === 0 ? "text-gold-400" : "text-foreground-muted group-hover:text-foreground"}`} />
          {(!collapsed || mobileOpen) && <span className="truncate">ภาพรวมทุกสาขา</span>}
          {pathname === "/" && selectedPages.size === 0 && <div className="absolute left-0 w-1 h-8 rounded-r-full bg-gold-400" />}
        </button>

        {pages.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">
            {(!collapsed || mobileOpen) && (
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                  ตัวกรองคลินิก
                </p>
                <div className="flex items-center gap-1.5">
                  {filteredPages.length > 0 && (
                    <button onClick={selectAll} className="text-[10px] text-gold-400 hover:text-gold-300">
                      {filteredPages.every(p => selectedPages.has(p.pageId)) ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                    </button>
                  )}
                  {selectedPages.size > 0 && (
                    <>
                      {filteredPages.length > 0 && <span className="text-[9px] text-white/10">|</span>}
                      <button onClick={clearPages} className="text-[10px] text-gold-400 hover:text-gold-300">
                        ล้าง ({selectedPages.size})
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {(!collapsed || mobileOpen) && (
              <div className="px-2 mb-3">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-foreground-muted" />
                  <input
                    type="text"
                    placeholder="ค้นหาคลินิก..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-navy-900 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-0.5 px-1 pb-4">
              {filteredPages.map((page) => {
                const isSelected = selectedPages.has(page.pageId);
                const showLabel = !collapsed || mobileOpen;

                return (
                  <button
                    key={page.pageId}
                    onClick={() => togglePage(page.pageId)}
                    className={`w-full group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all duration-200 ${
                      !showLabel ? "justify-center" : ""
                    } hover:bg-navy-800 ${isSelected ? "text-foreground" : "text-foreground-muted"}`}
                    title={page.pageName}
                  >
                    <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded border ${isSelected ? "bg-gold-500 border-gold-500 text-navy-950" : "border-border bg-navy-900 group-hover:border-gold-500/50"}`}>
                      {isSelected && <CheckSquare size={14} className="hidden" />}
                      {isSelected ? <CheckSquare size={16} className="absolute" /> : null}
                    </div>
                    {showLabel && <span className="truncate text-left text-xs">{page.pageName}</span>}
                  </button>
                );
              })}
              {filteredPages.length === 0 && (!collapsed || mobileOpen) && (
                <div className="text-center py-4 text-xs text-foreground-muted">ไม่พบข้อมูล</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapse Button — desktop only */}
      <div className="hidden lg:block p-3 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground-muted hover:bg-navy-800 hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>ย่อเมนู</span>}
        </button>
      </div>
    </aside>
  );
}
