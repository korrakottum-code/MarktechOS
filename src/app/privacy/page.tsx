import { ShieldCheck, Lock, Eye, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-foreground font-sans selection:bg-gold-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors mb-8 group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Back to Login</span>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gold-500/10 rounded-2xl border border-gold-500/20">
              <ShieldCheck className="text-gold-400" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Privacy <span className="text-gold-400 italic">Policy</span>
            </h1>
          </div>
          <p className="text-foreground-muted text-lg opacity-70">
            นโยบายความเป็นส่วนตัวของ MarkTech OS — อัปเดตล่าสุด: 1 เมษายน 2024
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-navy-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl space-y-12">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gold-400">
              <Lock size={24} />
              <h2 className="text-2xl font-bold">1. ข้อมูลที่เราจัดเก็บ (Data Collection)</h2>
            </div>
            <p className="text-foreground-muted leading-relaxed">
              MarkTech OS จัดเก็บข้อมูลที่จำเป็นสำหรับการทำงานของระบบเอเจนซี่เท่านั้น ซึ่งรวมถึง:
            </p>
            <ul className="list-disc list-inside text-foreground-muted/80 space-y-2 ml-4">
              <li>ข้อมูลประจำตัว (ชื่อ, อีเมล) ผ่านระบบ Supabase Auth</li>
              <li>ข้อมูล Leads ที่ได้รับจาก Meta Ads (Facebook Lead Ads)</li>
              <li>ข้อมูลการใช้งาน Dashboard ภายในองค์กร</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gold-400">
              <Eye size={24} />
              <h2 className="text-2xl font-bold">2. การใช้งานข้อมูล (How we use data)</h2>
            </div>
            <p className="text-foreground-muted leading-relaxed">
              เราใช้ข้อมูลเพื่อวัตถุประสงค์ดังต่อไปนี้เท่านั้น:
            </p>
            <ul className="list-disc list-inside text-foreground-muted/80 space-y-2 ml-4">
              <li>เพื่อแสดงผลประสิทธิภาพโฆษณาและการบริหารจัดการลูกค้า (Leads)</li>
              <li>เพื่อระบุตัวตนและสิทธิ์การเข้าถึงข้อมูล (Role-based Access Control)</li>
              <li>เพื่อส่งการแจ้งเตือนงานและการอัปเดตสถานะโฆษณา</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gold-400">
              <FileText size={24} />
              <h2 className="text-2xl font-bold">3. การรักษาความปลอดภัย</h2>
            </div>
            <p className="text-foreground-muted leading-relaxed">
              ข้อมูลทั้งหมดจะถูกจัดเก็บไว้ในฐานข้อมูลที่มีการเข้ารหัส (Encrypted Database) ของ Supabase 
              และมีการป้องกันการเข้าถึงผ่านระบบ Middleware ที่ทันสมัย ข้อมูลลูกค้าของคุณจะไม่ถูกนำไปแชร์ให้บุคคลภายนอก 
              เว้นแต่เป็นการทำงานร่วมกับเครื่องมืออย่าง Meta Graph API ตามที่คุณอนุญาต
            </p>
          </section>

          <section className="pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-foreground-muted/60 mb-2">
              หากมีคำถามเกี่ยวกับความปลอดภัยของข้อมูล ติดต่อทีมบริหารที่
            </p>
            <a 
              href="mailto:support@marktech.media" 
              className="text-gold-400 font-bold hover:underline"
            >
              support@marktech.media
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[11px] text-foreground-muted/40 uppercase tracking-[0.3em] font-medium">
          MarkTech OS &middot; Media Agency Operating System &middot; Powering the future
        </div>
      </div>
    </div>
  );
}
