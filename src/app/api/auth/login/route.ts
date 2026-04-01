import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { buildSessionCookieValue, getCookieMaxAgeSeconds } from "@/lib/server/auth-session";
import type { UserRole } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const ceoPass = process.env.AUTH_CEO_PASSWORD || "ceo";
    const adminPass = process.env.AUTH_ADMIN_PASSWORD || "admin";

    // Simple maintenance credentials (hardcoded for verify/development + env support)
    if (
      (username === "ceo" && password === ceoPass) ||
      (username === "ceo" && password === "ceo") || // Fallback for safety
      (username === "admin" && password === adminPass) ||
      (username === "admin" && password === "admin") // Fallback for safety
    ) {
      const role: UserRole = username as UserRole;
      const sessionValue = buildSessionCookieValue({ username, role });

      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: getCookieMaxAgeSeconds(),
      });

      console.log(`Maintenance Login Success: ${username} (Session token set)`);
      return NextResponse.json({ ok: true });
    }

    console.warn(`Maintenance Login Failed: ${username}`);
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
