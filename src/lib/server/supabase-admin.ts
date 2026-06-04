import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase admin client using the service_role key.
 * This client bypasses RLS and can perform admin operations like creating/updating users.
 * MUST ONLY be used in server-side code (API routes, server actions).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable admin features."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
