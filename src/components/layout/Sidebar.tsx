"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Layers,
  BarChart3,
  Wallet,
  Brain,
  Ticket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    label: "ภาพรวม",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Admin CRM & Sales",
    href: "/admin-crm",
    icon: MessageSquare,
    badge: "M1",
  },
  {
    label: "Operation & Content",
    href: "/operation",
    icon: Layers,
    badge: "M2",
  },
  {
    label: "Client & HR Dashboard",
    href: "/client-hr",
    icon: BarChart3,
    badge: "M3",
  },
  {
    label: "Accounting & Finance",
    href: "/incentive",
    icon: Wallet,
    badge: "M4",
  },
  {
    label: "AI Brain (RAG)",
    href: "/ai-brain",
    icon: Brain,
    badge: "M5",
    disabled: true,
  },
  {
    label: "Ticketing Hub",
    href: "/ticketing",
    icon: Ticket,
    badge: "M6",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-64"
      } bg-navy-950 border-r border-border`}
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
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold text-gold-gradient tracking-wide">
              MARKTECH OS
            </h1>
            <p className="text-[10px] text-foreground-muted -mt-0.5">
              Data-Driven Platform
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-40 cursor-not-allowed ${
                  collapsed ? "justify-center" : ""
                }`}
                title={collapsed ? item.label : `${item.label} (เร็วๆ นี้)`}
              >
                <Icon size={20} className="shrink-0 text-foreground-muted" />
                {!collapsed && (
                  <>
                    <span className="text-foreground-muted truncate">
                      {item.label}
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-foreground-muted">
                      Soon
                    </span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-gradient-to-r from-gold-500/15 to-transparent text-gold-400 border border-gold-500/20"
                  : "text-foreground-muted hover:bg-navy-800 hover:text-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`shrink-0 ${
                  isActive
                    ? "text-gold-400"
                    : "text-foreground-muted group-hover:text-foreground"
                }`}
              />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? "bg-gold-500/20 text-gold-400"
                          : "bg-navy-700 text-foreground-muted"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <div className="absolute left-0 w-1 h-8 rounded-r-full bg-gold-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground-muted hover:bg-navy-800 hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>ย่อเมนู</span>}
        </button>
      </div>
    </aside>
  );
}
