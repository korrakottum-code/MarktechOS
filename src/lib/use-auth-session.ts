"use client";

import { useCallback, useEffect, useState } from "react";

import { getDisplayNameFromSupabaseUser, getRoleFromSupabaseUser } from "@/lib/auth/user-role";
import type { UserRole } from "@/lib/auth/permissions";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface AuthSessionUser {
  username: string;
  role: UserRole;
}

export function useAuthSession() {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUser(null);
        return;
      }

      setUser({
        username: getDisplayNameFromSupabaseUser(user),
        role: getRoleFromSupabaseUser(user),
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    user,
    loading,
    reload: load,
  };
}
