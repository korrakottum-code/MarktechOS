import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/lib/auth/permissions";
import { isAuthEnabled } from "@/lib/auth/config";

export async function requireSession(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<
  | { ok: true; user: { username: string; role: UserRole; email: string } }
  | { ok: false; response: NextResponse }
> {
  if (!isAuthEnabled()) {
    return {
      ok: true,
      user: {
        username: "system",
        role: "ceo",
        email: "system@internal",
      },
    };
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Hardcoded CEO privilege for the primary admin email
  let role: UserRole = "am"; // Default role
  if (user.email === "korrakottum@gmail.com") {
    role = "ceo";
  } else {
    // In a real app, you'd fetch this from your 'Admin' table in Prisma
    // For now, we'll use the metadata or default to AM
    role = (user.user_metadata?.role as UserRole) || "am";
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { 
    ok: true, 
    user: { 
      username: user.email?.split("@")[0] || "user", 
      role,
      email: user.email || "" 
    } 
  };
}
