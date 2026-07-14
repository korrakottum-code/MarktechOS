import type { User } from "@supabase/supabase-js";

import { parseUserRole, type UserRole } from "@/lib/auth/permissions";

export function getRoleFromSupabaseUser(user: User): UserRole {
  // Keep the primary owner override consistent with the server auth guard.
  // This account may predate app_metadata roles and must not be downgraded to
  // a client simply because its metadata is incomplete.
  if (user.email === "korrakottum@gmail.com") return "ceo";

  const appMetaRole = parseUserRole(
    typeof user.app_metadata?.role === "string" ? user.app_metadata.role : undefined
  );

  if (appMetaRole) return appMetaRole;

  // Missing/invalid authorization metadata must never grant administrator
  // access. A client with no assigned pages consequently sees no ad data.
  return "client";
}

/**
 * Read the allowed page IDs from Supabase app_metadata.
 * Returns `null` if the user has unrestricted access (no allowed_pages set).
 * Returns an array of page ID strings if restricted.
 */
export function getAllowedPagesFromSupabaseUser(user: User): string[] | null {
  const allowedPages = user.app_metadata?.allowed_pages;

  if (!Array.isArray(allowedPages)) return null;

  // Ensure all entries are strings
  const validated = allowedPages.filter(
    (p: unknown): p is string => typeof p === "string" && p.length > 0
  );

  return validated.length > 0 ? validated : null;
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
