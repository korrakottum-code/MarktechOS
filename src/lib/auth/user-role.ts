import type { User } from "@supabase/supabase-js";

import { parseUserRole, type UserRole } from "@/lib/auth/permissions";

export function getRoleFromSupabaseUser(user: User): UserRole {
  const appMetaRole = parseUserRole(
    typeof user.app_metadata?.role === "string" ? user.app_metadata.role : undefined
  );

  if (appMetaRole) return appMetaRole;

  return "admin";
}

export function getDisplayNameFromSupabaseUser(user: User): string {
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  if (metaName && metaName.trim().length > 0) return metaName.trim();

  if (user.email) return user.email;
  if (user.phone) return user.phone;

  return user.id;
}
