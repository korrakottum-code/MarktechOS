import { createClient } from "@/utils/supabase/server";

/**
 * Read the current user's allowed page IDs from Supabase auth (server-side).
 * Returns `null` if the user is unrestricted (no allowed_pages set or not logged in).
 * Returns an array of page ID strings if the user is restricted.
 */
export async function getAllowedPagesForCurrentUser(): Promise<string[] | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const allowedPages = user.app_metadata?.allowed_pages;
    if (!Array.isArray(allowedPages)) return null;

    const validated = allowedPages.filter(
      (p: unknown): p is string => typeof p === "string" && p.length > 0
    );

    return validated.length > 0 ? validated : null;
  } catch {
    return null;
  }
}
