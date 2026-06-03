"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X, LayoutDashboard, Monitor } from "lucide-react";
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
  const { user } = useAuthSession();
  const [pages, setPages] = useState<PageData[]>([]);

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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Overview Item */}
        <Link
          href="/"
          onClick={onCloseMobile}
          className={`relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
            (!collapsed || mobileOpen) ? "" : "justify-center"
          } ${
            pathname === "/"
              ? "bg-gradient-to-r from-gold-500/15 to-transparent text-gold-400 border border-gold-500/20"
              : "text-foreground-muted hover:bg-navy-800 hover:text-foreground"
          }`}
          title={collapsed && !mobileOpen ? "ภาพรวมทั้งหมด" : undefined}
        >
          <LayoutDashboard size={20} className={`shrink-0 ${pathname === "/" ? "text-gold-400" : "text-foreground-muted group-hover:text-foreground"}`} />
          {(!collapsed || mobileOpen) && <span className="truncate">ภาพรวมทั้งหมด</span>}
          {pathname === "/" && <div className="absolute left-0 w-1 h-8 rounded-r-full bg-gold-400" />}
        </Link>

        {pages.length > 0 && (
          <div className="pt-4 pb-2">
            {(!collapsed || mobileOpen) && (
              <p className="px-3 text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">
                คลินิก / เพจ
              </p>
            )}
          </div>
        )}

        {pages.map((page) => {
          const href = `/page/${page.pageId}`;
          const isActive = pathname === href;
          const showLabel = !collapsed || mobileOpen;

          return (
            <Link
              key={page.pageId}
              href={href}
              onClick={onCloseMobile}
              className={`relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                !showLabel ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-gradient-to-r from-gold-500/15 to-transparent text-gold-400 border border-gold-500/20"
                  : "text-foreground-muted hover:bg-navy-800 hover:text-foreground"
              }`}
              title={!showLabel ? page.pageName : undefined}
            >
              <Monitor
                size={20}
                className={`shrink-0 ${
                  isActive
                    ? "text-gold-400"
                    : "text-foreground-muted group-hover:text-foreground"
                }`}
              />
              {showLabel && <span className="truncate">{page.pageName}</span>}
              {isActive && (
                <div className="absolute left-0 w-1 h-8 rounded-r-full bg-gold-400" />
              )}
            </Link>
          );
        })}
      </nav>

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
