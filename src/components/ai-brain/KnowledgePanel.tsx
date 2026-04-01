"use client";

import { Database, Building2 } from "lucide-react";
import type { QuickAction } from "@/lib/app-data-types";

interface KnowledgePanelProps {
  onQuickAction: (prompt: string) => void;
  quickActions: QuickAction[];
  knowledgeBaseInfo: {
    global: {
      label: string;
      items: { icon: string; label: string; count: number }[];
    };
    clinics: { name: string; docs: number; lastUpdated: string }[];
  };
}

export default function KnowledgePanel({
  onQuickAction,
  quickActions,
  knowledgeBaseInfo,
}: KnowledgePanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
          คำถามด่วน
        </h3>
        <div className="space-y-2">
          {quickActions.map((action: QuickAction) => (
            <button
              key={action.id}
              onClick={() => onQuickAction(action.prompt)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl bg-navy-800/50 border border-border hover:border-gold-500/30 hover:bg-navy-800 transition-all text-sm group"
            >
              <span className="text-base">{action.icon}</span>
              <span className="text-foreground-muted group-hover:text-foreground transition-colors truncate">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Global Knowledge Base */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-gold-400" />
          <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Global Knowledge
          </h3>
        </div>
        <div className="space-y-1.5">
          {knowledgeBaseInfo.global.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
            >
              <span className="text-foreground-muted">
                {item.icon} {item.label}
              </span>
              <span className="text-gold-400 font-mono">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Clinic Knowledge */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={14} className="text-gold-400" />
          <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Per-Clinic Knowledge
          </h3>
        </div>
        <div className="space-y-1.5">
          {knowledgeBaseInfo.clinics.map((clinic, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
            >
              <span className="text-foreground-muted truncate">
                🏥 {clinic.name}
              </span>
              <span className="text-foreground-muted font-mono shrink-0">
                {clinic.docs} docs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
