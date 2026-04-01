import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { buildSessionCookieValue, getCookieMaxAgeSeconds } from "@/lib/server/auth-session";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { accessToken?: string };
  const accessToken = body?.accessToken?.trim();

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Supabase environment is not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return NextResponse.json({ error: "Invalid Supabase session" }, { status: 401 });
  }

  // 🛡️ Real Auth Identification Logic
  const email = user.email;
  const phone = user.phone;

  // Search for the staff record in our normalized SQL DB
  const staff = await prisma.staff.findFirst({
    where: {
      OR: [
        email ? { email } : {},
        phone ? { phone } : {},
      ].filter(cond => Object.keys(cond).length > 0)
    }
  });

  if (!staff) {
    // Audit: Log restricted access attempt
    console.warn(`Restricted access attempt from ${email || phone || user.id}`);
    return NextResponse.json(
      { error: "Account not registered. Please contact your administrator." },
      { status: 403 }
    );
  }

  const role: any = staff.role;
  const username = staff.name;

  const response = NextResponse.json({
    ok: true,
    user: {
      id: staff.id,
      username,
      role,
      email: staff.email,
      phone: staff.phone,
    },
  });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: buildSessionCookieValue({ username, role }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getCookieMaxAgeSeconds(),
  });

  return response;
}
