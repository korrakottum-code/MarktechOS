import { NextRequest, NextResponse } from "next/server";

import { readSessionUserFromRequest } from "@/lib/server/auth-session";

export async function GET(request: NextRequest) {
  const user = readSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
