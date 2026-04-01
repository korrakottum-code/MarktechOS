import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAppData } from "@/lib/server/app-data-store";
import { requireSession } from "@/lib/server/auth-guard";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session.ok) return session.response;

  const key = process.env.GEMINI_API_KEY;
  console.log("AI Brain: Using key", key ? `${key.slice(0, 8)}...` : "UNDEFINED");

  const body = (await request.json()) as { message?: string };
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // 1. Check for real LLM key
  if (key) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const appData = await getAppData();
      
      const pendingAdminClients = appData.clients
        .filter((c: any) => c.services?.includes("Admin ตอบแชท") && (!c.assignedAdminIds || c.assignedAdminIds.length === 0))
        .map((c: any) => c.name);
      const overdueInvoices = (appData.invoices || []).filter((i: any) => i.status === "overdue");

      const systemPrompt = `คุณคือ "AI Brain" สมองกลอัจฉริยะประจำแพลตฟอร์ม MarkTech OS
      หน้าที่ของคุณคือวิเคราะห์ข้อมูลและช่วยบริหารจัดการธุรกิจแบบบูรณาการ (Integrated Agency Management)
      
      Agency Flow (5 ระยะ):
      1. Sales → ขายบริการให้คลินิก (Pipeline: Prospect → Won/Lost)
      2. Onboarding → เก็บ Requirement, ระบุ Admin, ขอ Access
      3. Production → ผลิต Content, ออกแบบ, Approve, ขึ้นแอด
      4. Execution → Admin ตอบแชท + Ads Optimize + ปิดการขาย
      5. Report & Retain → สรุปผลเดือน, ต่อสัญญา, NPS

      กฎการดูแลเพจ (Admin Ownership - Shared Pool Model):
      - แอดมินทุกคน (ทั้ง 12 คน) มีหน้าที่ตอบแชทและดูแลเพจลูกค้าทุกคลินิกร่วมกัน
      - แต่ลูกค้าที่เลือกบริการ "Admin ตอบแชท" ต้องมีการระบุแอดมินเข้าดูแลก่อนวันขึ้นงาน
      - ลูกค้าที่รอระบุแอดมิน: ${pendingAdminClients.length > 0 ? pendingAdminClients.join(", ") : "ไม่มี (ครบทุกราย)"}
      
      สถานะการเงิน (Invoice & Billing):
      - ใบแจ้งหนี้ทั้งหมด: ${(appData.invoices || []).length} ใบ
      - ค้างชำระ (Overdue): ${overdueInvoices.length} ใบ ${overdueInvoices.length > 0 ? "— " + overdueInvoices.map((i: any) => `${i.clientName}: ฿${i.amount.toLocaleString()}`).join(", ") : ""}

      ข้อมูลปัจจุบัน:
      - Leads: ${appData.leads.length} ราย
      - Deals: ${appData.salesDeals.length} ราย (Won: ${appData.salesDeals.filter((d: any) => d.stage === 'won').length})
      - Tasks: ${appData.operationTasks.length} ราย
      - ลูกค้า: ${appData.clients.length} ราย
      
      บริบทเพิ่มเติม (Knowledge Base):
      ${appData.aiResponseLibrary.map((item: any) => `Q: ${item.prompt} A: ${item.answer}`).join("\n")}
      
      คำแนะนำในการตอบ:
      1. ให้คำแนะนำที่เชื่อมโยงระหว่างทุกทีม (Sales, Admin, Content, Ads, Finance)
      2. ตอบเป็นภาษาไทยระดับมืออาชีพ
      3. หากถามเรื่อง Invoice/Billing ให้อ้างอิงข้อมูลจริงจากระบบ`;

      const result = await model.generateContent([systemPrompt, message]);
      const response = await result.response;
      const text = response.text();

      return NextResponse.json({ answer: text });
    } catch (error) {
      console.error("AI Brain Error:", error);
      // Fallback to mock if API fails
    }
  }

  // 2. Advanced Mock Fallback (Keyword Matching + Agentic Persona)
  const data = await getAppData();
  const answer = findBestAnswer(message, data.aiResponseLibrary);

  return NextResponse.json({ answer });
}

function findBestAnswer(
  message: string,
  library: { prompt: string; answer: string }[]
): string {
  const normalized = message.toLowerCase().trim();

  const exact = library.find(
    (entry) => entry.prompt.toLowerCase().trim() === normalized
  );
  if (exact) return exact.answer;

  const partial = library.find((entry) => {
    const source = entry.prompt.toLowerCase();
    return (
      source.includes(normalized) ||
      normalized.includes(source.slice(0, Math.min(source.length, 16)))
    );
  });
  if (partial) return partial.answer;

  const isSetupQuestion = normalized.includes("setup") || normalized.includes("แชท") || normalized.includes("ต่อ");
  if (isSetupQuestion) {
    return `🤖 **ระบบ AI Brain Simulation**\n\nตอนนี้ระบบยังทำงานในโหมดจำลอง (Keyword Matching) ค่ะ\n\n**วิธีเชื่อมต่อสมองจริง (LLM):**\n1. รับ API Key จาก Google AI Studio (Gemini)\n2. เพิ่ม \`GEMINI_API_KEY=your_key\` ในไฟล์ .env.local\n3. รีสตาร์ทระบบ\n\nเมื่อเชื่อมต่อแล้ว ฉันจะสามารถวิเคราะห์ข้อมูลสดๆ ใน Dashboard และตอบคำถามที่ซับซ้อนได้ทันทีค่ะ!`;
  }

  return `ขอบคุณสำหรับคำถามค่ะ 🙏 (โหมดจำลอง)\n\nตอนนี้ระบบยังไม่มีข้อมูลที่ตรงกับ "${message}" ใน Knowledge Base\n\n**สิ่งที่จะเกิดขึ้น:**\n1. ระบบจะบันทึกคำถามนี้ไว้ในคิวปรับปรุงความรู้\n2. หัวหน้าทีมสามารถเพิ่มคำตอบผ่านฐานข้อมูลกลางได้\n\n> 💡 แนะนำ: ลองถามเรื่อง "Setup" เพื่อดูวิธีเชื่อมต่อ AI ของจริงค่ะ`;
}
