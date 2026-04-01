import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

import { parseUserRole, type UserRole } from "@/lib/auth/permissions";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

interface SessionPayload {
  username: string;
  role: UserRole;
  exp: number;
}

interface SessionUser {
  username: string;
  role: UserRole;
}

interface LoginCandidate {
  username: string;
  password: string;
  role: UserRole;
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("AUTH_SESSION_SECRET must be set with at least 16 characters");
  }
  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function sign(encodedPayload: string): string {
  const secret = getSessionSecret();
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createToken(payload: SessionPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(encodedSignature);

  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const username = (parsed as { username?: unknown }).username;
  const roleValue = (parsed as { role?: unknown }).role;
  const exp = (parsed as { exp?: unknown }).exp;

  if (typeof username !== "string") return null;
  if (typeof exp !== "number") return null;
  if (exp * 1000 < Date.now()) return null;

  const role = parseUserRole(typeof roleValue === "string" ? roleValue : undefined);
  if (!role) return null;

  return { username, role, exp };
}

export function buildSessionCookieValue(user: SessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return createToken({ username: user.username, role: user.role, exp });
}

export function readSessionUserFromToken(token: string | undefined): SessionUser | null {
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    username: payload.username,
    role: payload.role,
  };
}

export function readSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return readSessionUserFromToken(token);
}

export function getCookieMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}

export function authenticateUser(username: string, password: string): SessionUser | null {
  const cleanUsername = username.trim();
  if (!cleanUsername || !password) return null;

  const candidates: LoginCandidate[] = [
    {
      username: process.env.AUTH_CEO_USERNAME?.trim() || "ceo",
      password: process.env.AUTH_CEO_PASSWORD || "",
      role: "ceo",
    },
    {
      username: process.env.AUTH_ADMIN_USERNAME?.trim() || "admin",
      password: process.env.AUTH_ADMIN_PASSWORD || "",
      role: "admin",
    },
    {
      username: process.env.AUTH_FINANCE_USERNAME?.trim() || "finance",
      password: process.env.AUTH_FINANCE_PASSWORD || "",
      role: "finance",
    },
    {
      username: process.env.AUTH_AM_USERNAME?.trim() || "am",
      password: process.env.AUTH_AM_PASSWORD || "",
      role: "am",
    },
  ];

  const match = candidates.find(
    (candidate) =>
      candidate.password.length > 0 &&
      candidate.username === cleanUsername &&
      candidate.password === password
  );

  if (!match) return null;

  return {
    username: match.username,
    role: match.role,
  };
}
