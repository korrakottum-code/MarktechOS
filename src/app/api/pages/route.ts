import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getAllowedPagesForCurrentUser } from "@/lib/server/allowed-pages";

export async function GET() {
  try {
    // Check user's allowed pages (page-level access control)
    const allowedPages = await getAllowedPagesForCurrentUser();

    const where: any = {};
    if (allowedPages) {
      where.pageId = { in: allowedPages };
    }

    const pages = await prisma.pageNameCache.findMany({
      where,
      orderBy: { pageName: "asc" }
    });
    return NextResponse.json({ pages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

