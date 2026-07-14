import { getRoleFromSupabaseUser } from "@/lib/auth/user-role";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/utils/supabase/server";

export class AuthenticationError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthenticationError";
  }
}

export interface PageAccess {
  /** null means unrestricted for this authenticated, non-client user. */
  allowedPages: string[] | null;
  role: UserRole;
}

/**
 * Resolve page access from a verified Supabase user. Authentication failures
 * deliberately throw rather than returning unrestricted access.
 */
export async function getPageAccessForCurrentUser(): Promise<PageAccess> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AuthenticationError();

  const role = getRoleFromSupabaseUser(user);
  if (role !== "client") return { role, allowedPages: null };

  const allowedPages = Array.isArray(user.app_metadata?.allowed_pages)
    ? user.app_metadata.allowed_pages.filter(
      (pageId: unknown): pageId is string => typeof pageId === "string" && pageId.length > 0
    )
    : [];

  // A client with no assigned pages must see no data, never all data.
  return { role, allowedPages };
}

/** @deprecated Prefer getPageAccessForCurrentUser so auth failures cannot fail open. */
export async function getAllowedPagesForCurrentUser(): Promise<string[] | null> {
  return (await getPageAccessForCurrentUser()).allowedPages;
}
