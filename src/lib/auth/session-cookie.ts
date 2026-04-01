import { parseUserRole, type UserRole } from "@/lib/auth/permissions";

export interface UnsafeSessionPayload {
  username: string;
  role: UserRole;
  exp: number;
}

function base64UrlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");

  return decodeURIComponent(
    Array.from(atob(normalized))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

export function readUnsafeSessionPayload(token: string | undefined): UnsafeSessionPayload | null {
  if (!token) return null;

  const encodedPayload = token.split(".")[0];
  if (!encodedPayload) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const username = (parsed as { username?: unknown }).username;
  const role = parseUserRole((parsed as { role?: string }).role);
  const exp = (parsed as { exp?: unknown }).exp;

  if (!role || typeof username !== "string" || typeof exp !== "number") {
    return null;
  }

  return {
    username,
    role,
    exp,
  };
}
