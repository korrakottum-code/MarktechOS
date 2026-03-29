"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { AIMessage, getAIResponse } from "@/lib/mock-ai-responses";

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void;
  externalPrompt?: string | null;
  onExternalPromptHandled?: () => void;
}

export default function ChatInterface({
  externalPrompt,
  onExternalPromptHandled,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "สวัสดีค่ะ! ฉันคือ **Marktech AI Brain** 🧠\n\nฉันสามารถช่วยเรื่อง:\n- ข้อมูลหัตถการและราคา\n- สคริปต์ปิดการขาย\n- โปรโมชันแต่ละคลินิก\n- กฎระเบียบและนโยบาย HR\n- คำต้องห้าม อย.\n\nถามได้เลยค่ะ! หรือเลือกจากปุ่มคำถามด่วนด้านขวา",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Handle external prompts from QuickActions
  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      onExternalPromptHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const handleSend = (text?: string) => {
    const message = text || input.trim();
    if (!message || isTyping) return;

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response = getAIResponse(message);
      const aiMsg: AIMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-gold-500 to-gold-300"
                  : "bg-navy-700"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot size={16} className="text-navy-950" />
              ) : (
                <User size={16} className="text-foreground-muted" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-navy-700 text-foreground rounded-tr-sm"
                  : "bg-navy-800/80 text-foreground border border-gold-500/10 rounded-tl-sm"
              }`}
            >
              <div
                className="prose prose-invert prose-sm max-w-none
                  [&_h2]:text-gold-400 [&_h2]:text-base [&_h2]:mt-2 [&_h2]:mb-2
                  [&_h3]:text-gold-300 [&_h3]:text-sm [&_h3]:mt-2 [&_h3]:mb-1
                  [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1
                  [&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border/50
                  [&_blockquote]:border-l-gold-500/50 [&_blockquote]:text-foreground-muted [&_blockquote]:text-xs
                  [&_strong]:text-gold-300 [&_code]:text-gold-400
                  [&_ul]:list-disc [&_ul]:pl-4 [&_li]:my-0.5"
                dangerouslySetInnerHTML={{
                  __html: simpleMarkdown(msg.content),
                }}
              />
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-navy-950" />
            </div>
            <div className="bg-navy-800/80 border border-gold-500/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-gold-400/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="ถามอะไรก็ได้..."
            disabled={isTyping}
            className="flex-1 bg-navy-800 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-medium text-sm hover:from-gold-400 hover:to-gold-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown to HTML converter (no external dependency)
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(
      /\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g,
      (_, header, body) => {
        const ths = header
          .split("|")
          .filter(Boolean)
          .map((h: string) => `<th>${h.trim()}</th>`)
          .join("");
        const rows = body
          .trim()
          .split("\n")
          .map((row: string) => {
            const tds = row
              .split("|")
              .filter(Boolean)
              .map((d: string) => `<td>${d.trim()}</td>`)
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("");
        return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
      }
    )
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
