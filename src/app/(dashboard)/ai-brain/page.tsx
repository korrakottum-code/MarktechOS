"use client";

import { useState } from "react";
import { Brain, Sparkles, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import ChatInterface from "@/components/ai-brain/ChatInterface";
import KnowledgePanel from "@/components/ai-brain/KnowledgePanel";
import { useAppData } from "@/lib/use-app-data";

export default function AIBrainPage() {
  const { payload, loading, error } = useAppData();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  const quickActions = payload?.data.aiQuickActions ?? [];
  const knowledgeBaseInfo = payload?.data.aiKnowledgeBase;

  if (loading || !knowledgeBaseInfo) {
    return <div className="text-sm text-foreground-muted">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
            <Brain size={22} className="text-navy-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/20 uppercase tracking-wider">
                Module: Insights
              </span>
              <span className="text-[9px] text-foreground-muted uppercase tracking-[0.2em]">
                Advance AI Insight (XL)
              </span>
            </div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              AI Brain & Analytical Insights
              <Sparkles size={16} className="text-gold-400" />
            </h1>
            <p className="text-xs text-foreground-muted">
              ฐานความรู้ AI สำหรับทีม Admin — ถามได้ทุกเรื่อง
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
            Live Data
          </span>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-navy-800 transition-colors"
          >
            <BookOpen size={14} />
            {showPanel ? (
              <>
                ซ่อน Knowledge <ChevronRight size={12} />
              </>
            ) : (
              <>
                <ChevronLeft size={12} /> แสดง Knowledge
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 bg-navy-900/50 border border-border rounded-2xl overflow-hidden flex flex-col">
          <ChatInterface
            externalPrompt={pendingPrompt}
            onExternalPromptHandled={() => setPendingPrompt(null)}
          />
        </div>

        {/* Knowledge Panel — desktop only */}
        {showPanel && (
          <div className="hidden lg:block w-72 bg-navy-900/50 border border-border rounded-2xl overflow-hidden shrink-0">
            <KnowledgePanel
              quickActions={quickActions}
              knowledgeBaseInfo={knowledgeBaseInfo}
              onQuickAction={(prompt) => setPendingPrompt(prompt)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
