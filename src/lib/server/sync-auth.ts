import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const OWNER_EMAIL = "korrakottum@gmail.com";

/** Allows the Vercel cron (Bearer CRON_SECRET) or a signed-in owner/ceo/admin. Returns a 401 response otherwise. */
export async function requireSyncAuthorization(req: NextRequest): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return null;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!error && user && (user.email === OWNER_EMAIL || role === "ceo" || role === "admin")) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
