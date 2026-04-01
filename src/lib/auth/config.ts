import { isSupabaseAuthEnabled } from "@/lib/supabase/env";

function hasConfiguredPasswords() {
  return [
    process.env.AUTH_CEO_PASSWORD,
    process.env.AUTH_ADMIN_PASSWORD,
    process.env.AUTH_FINANCE_PASSWORD,
    process.env.AUTH_AM_PASSWORD,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

export function isAuthEnabled() {
  return (
    Boolean(process.env.AUTH_SESSION_SECRET) &&
    (hasConfiguredPasswords() || isSupabaseAuthEnabled())
  );
}
