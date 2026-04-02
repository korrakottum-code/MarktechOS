มัน"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function finalizeSupabaseLogin() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error("No Supabase session found");
  }

  const response = await fetch("/api/auth/supabase-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken: session.access_token,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to establish application session");
  }

  return response.json();
}
