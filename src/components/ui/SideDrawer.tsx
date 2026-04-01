"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function SideDrawer({ open, onClose, title, subtitle, children, footer, width = "max-w-md" }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent scroll on body when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        ref={drawerRef}
        className={`relative w-full ${width} bg-navy-900 border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-navy-800/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-foreground-muted mt-1 italic">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-navy-800 rounded-full transition-colors group"
          >
            <X size={20} className="text-foreground-muted group-hover:text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-navy-950/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
