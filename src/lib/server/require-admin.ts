import { createClient } from "@/utils/supabase/server";

// CEO email or explicit admin/ceo role — mirrors the check in /api/admin/users
// and the manual-sync authorization in /api/cron/sync-ads.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const role = user.app_metadata?.role;
  if (user.email === "korrakottum@gmail.com") return user;
  if (role === "ceo" || role === "admin") return user;
  return null;
}
