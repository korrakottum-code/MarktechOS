"use client";

import { useTransition, useState, Suspense } from "react";
import { login } from "./actions";
import { Lock, Mail, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await login(formData);
    });
  };

  return (
    <div className="w-full max-w-[440px] px-6 relative z-10">
      {/* Logo Section */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shadow-2xl shadow-gold-500/20 mb-6">
          <div className="w-full h-full bg-navy-900 rounded-[14px] flex items-center justify-center">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gold-300 via-gold-500 to-gold-600">M</span>
          </div>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
          MarkTech <span className="text-gold-400 font-medium italic">OS</span>
        </h1>
        <p className="text-[13px] text-foreground-muted uppercase tracking-[0.3em] font-semibold opacity-70">
          Agent Portal — ยินดีต้อนรับสู่ระบบ
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-navy-900/40 backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 shadow-2xl animate-fade-in-up delay-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-shake">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {message && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <p>{message}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground-muted/60 uppercase tracking-widest ml-1">
              อีเมล์ผู้ใช้งาน
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground-muted group-focus-within:text-gold-400 transition-colors">
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 bg-navy-950/50 border border-white/5 rounded-2xl text-sm text-foreground focus:outline-none focus:border-gold-500/40 focus:ring-4 focus:ring-gold-500/5 transition-all placeholder:text-foreground-muted/30"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-bold text-foreground-muted/60 uppercase tracking-widest">
                รหัสผ่าน
              </label>
              <Link href="#" className="text-[11px] text-gold-400/80 hover:text-gold-400 transition-colors font-semibold">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground-muted group-focus-within:text-gold-400 transition-colors">
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 bg-navy-950/50 border border-white/5 rounded-2xl text-sm text-foreground focus:outline-none focus:border-gold-500/40 focus:ring-4 focus:ring-gold-500/5 transition-all placeholder:text-foreground-muted/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-br from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-navy-950 font-bold rounded-2xl transition-all shadow-xl shadow-gold-500/20 hover:shadow-gold-500/30 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-4 group"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                เข้าสู่ระบบ
                <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-foreground-muted">
            ต้องการบัญชีเข้าใช้งาน?{" "}
            <Link href="#" className="text-gold-400 font-bold hover:underline transition-all">
              ขอสิทธิ์การเข้าถึง
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-navy-950 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <Suspense fallback={<div className="text-gold-400 animate-pulse">กำลังโหลดระบบรักษาความปลอดภัย...</div>}>
        <LoginContent />
      </Suspense>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <p className="text-[10px] text-foreground-muted opacity-40 uppercase tracking-[0.2em] font-semibold">
          &copy; 2024 MarkTech Media Agency &middot; Secure Logic v2.0
        </p>
      </div>
    </div>
  );
}
