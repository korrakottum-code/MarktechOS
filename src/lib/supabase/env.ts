export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

export function isSupabaseAuthEnabled() {
  const env = getSupabaseEnv();
  const hasPlaceholders =
    env.url.includes("YOUR-PROJECT-REF") ||
    env.anonKey.includes("YOUR_SUPABASE_ANON_KEY") ||
    env.url.includes("example.supabase.co");

  return Boolean(env.url && env.anonKey && !hasPlaceholders);
}
