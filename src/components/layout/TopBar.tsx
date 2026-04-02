"use client";

import { Bell, Search, User, ChevronDown, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/lib/use-auth-session";
import { useAppData } from "@/lib/use-app-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const { payload } = useAppData();
  const notifications = payload?.data.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [showNotif, setShowNotif] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const roleLabel = user ? user.role.toUpperCase() : "GUEST";

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  // Click outside to close notifications
  useEffect(() => {
    if (!showNotif) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotif]);


  return (
    <header className="h-16 border-b border-border bg-navy-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-navy-800 transition-colors"
        >
          <Menu size={20} className="text-foreground-muted" />
        </button>
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            placeholder="ค้นหา Lead, พนักงาน, คลินิก..."
            className="w-full bg-navy-800 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl hover:bg-navy-800 transition-colors"
          >
            <Bell size={20} className="text-foreground-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full animate-pulse-gold" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-navy-900 border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  การแจ้งเตือน
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border/50 hover:bg-navy-800 transition-colors cursor-pointer ${
                      !n.read ? "bg-gold-500/5" : ""
                    }`}
                  >
                    <p className="text-sm text-foreground font-medium">{n.title}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-foreground-muted mt-1">
                      {n.time}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotif(false)}
                  className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                >
                  ดูทั้งหมด
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
            <User size={16} className="text-navy-950" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">
              {user?.username || "Guest"}
            </p>
            <p className="text-[11px] text-foreground-muted">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-[11px] px-2 py-1 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-gold-500/50 transition-colors disabled:opacity-50"
            disabled={loggingOut}
          >
            {loggingOut ? "..." : "Logout"}
          </button>
          <ChevronDown size={14} className="text-foreground-muted" />
        </div>
      </div>
    </header>
  );
}
