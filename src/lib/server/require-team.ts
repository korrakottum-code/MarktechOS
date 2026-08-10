import { createClient } from "@/utils/supabase/server";
import { isClientRole, parseUserRole } from "@/lib/auth/permissions";

// Any authenticated non-client (team) user — gates read access to shared
// dashboard config like PageReportSet. Write access still goes through the
// stricter requireAdmin.
export async function requireTeamMember() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const role = parseUserRole(user.app_metadata?.role) ?? "client";
  if (isClientRole(role)) return null;
  return user;
}
