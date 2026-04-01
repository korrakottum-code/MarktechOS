"use client";

import { useCallback, useEffect, useState } from "react";

import type { UserRole } from "@/lib/auth/permissions";

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
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }

      const payload = (await response.json()) as {
        authenticated?: boolean;
        user?: AuthSessionUser;
      };

      if (payload.authenticated && payload.user) {
        setUser(payload.user);
      } else {
        setUser(null);
      }
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
