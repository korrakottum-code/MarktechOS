import type { Metadata } from "next";

// Server Component โดยตั้งใจ (ไม่มี "use client") — เนื้อหาต้องอยู่ใน HTML ที่เสิร์ฟมาตั้งแต่แรก
// เพราะตัวตรวจสอบของ Google (สำหรับขอสิทธิ์ OAuth) ไม่รัน JavaScript
export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Marktech Media",
  description: "นโยบายความเป็นส่วนตัวของ Marktech Media",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-1">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-sm text-gray-500 mb-8">อัปเดตล่าสุด: 21 กันยายน 2569</p>

        <p className="mb-6 leading-relaxed">
          บริษัท มาร์คเท็ค มีเดีย (&ldquo;เรา&rdquo;) ให้บริการเครื่องมือภายในสำหรับทีมงานและลูกค้าของเรา
          นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร และติดต่อเราได้อย่างไร
        </p>

        <h2 className="text-lg font-semibold text-white mt-8 mb-2">ข้อมูลที่เราเข้าถึง</h2>
        <p className="mb-6 leading-relaxed">
          เมื่อผู้ใช้เชื่อมบัญชี Google กับระบบของเรา เราจะขอสิทธิ์เข้าถึงปฏิทิน Google Calendar
          เฉพาะส่วนที่จำเป็นต่อการสร้างและจัดการนัดหมาย เราไม่เข้าถึงอีเมล ไฟล์ รายชื่อผู้ติดต่อ
          หรือข้อมูลอื่นใดในบัญชี Google ของผู้ใช้
        </p>

        <h2 className="text-lg font-semibold text-white mt-8 mb-2">เราใช้ข้อมูลทำอะไร</h2>
        <p className="mb-6 leading-relaxed">
          เราใช้สิทธิ์ดังกล่าวเพื่อสร้างนัดหมายและลิงก์ห้องประชุมออนไลน์ตามคำสั่งของผู้ใช้เท่านั้น
          เราไม่นำข้อมูลไปใช้เพื่อการโฆษณา ไม่ขาย และไม่เปิดเผยให้บุคคลภายนอก
          ยกเว้นกรณีที่กฎหมายกำหนด
        </p>

        <h2 className="text-lg font-semibold text-white mt-8 mb-2">การเก็บรักษาข้อมูล</h2>
        <p className="mb-6 leading-relaxed">
          เราเก็บเฉพาะกุญแจสำหรับเชื่อมต่อบัญชี (access token) ไว้ในระบบที่มีการควบคุมการเข้าถึง
          ผู้ใช้สามารถยกเลิกการเชื่อมต่อได้ตลอดเวลาที่หน้า{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-indigo-400 hover:underline"
          >
            myaccount.google.com/permissions
          </a>{" "}
          เมื่อยกเลิกแล้ว เราจะไม่สามารถเข้าถึงข้อมูลในบัญชีนั้นได้อีก
        </p>

        <h2 className="text-lg font-semibold text-white mt-8 mb-2">ติดต่อเรา</h2>
        <p className="leading-relaxed">
          อีเมล: privacy@marktech.media
          <br />
          เว็บไซต์:{" "}
          <a href="https://marktech.media" className="text-indigo-400 hover:underline">
            https://marktech.media
          </a>
        </p>
      </div>
    </div>
  );
}
