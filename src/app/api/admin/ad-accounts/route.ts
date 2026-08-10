import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/require-admin";
import { getMetaTokens, listAdAccounts } from "@/lib/server/meta-accounts";

// ── GET /api/admin/ad-accounts — live list of Meta ad accounts for the sync picker ──
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tokens = getMetaTokens();
    if (tokens.length === 0) {
      return NextResponse.json({ error: "META_SYSTEM_USER_TOKEN ยังไม่ได้ตั้งค่า" }, { status: 500 });
    }
    const accounts = await listAdAccounts(tokens);
    return NextResponse.json({ accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ admin/ad-accounts GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
