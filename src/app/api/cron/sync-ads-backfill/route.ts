import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { requireSyncAuthorization } from "@/lib/server/sync-auth";
import { GET as runSync } from "../sync-ads/route";

// Re-syncs days that were never fetched after they ended — e.g. days the daily
// cron did not run. The daily cron already re-fetches the last 7 days, so this
// only looks at older days. Each run fixes at most BACKFILL_MAX_DAYS days
// (oldest first) to stay inside the function time limit; any remainder is
// picked up by the next run.
const LOOKBACK_DAYS = 45;
const RECENT_WINDOW_DAYS = 7;
const BACKFILL_MAX_DAYS = 7;

export const maxDuration = 300;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireSyncAuthorization(req);
  if (unauthorized) return unauthorized;

  const from = isoDaysAgo(LOOKBACK_DAYS);
  const to = isoDaysAgo(RECENT_WINDOW_DAYS);

  // An account/day is missing when it was never synced after the day ended.
  // Only accounts that synced successfully in the last few days count — an
  // account that was removed, disabled or keeps failing would otherwise show as
  // missing forever and pin the backfill to the same oldest range every run.
  // Days before an account's first recorded day are not expected either.
  const gaps = await prisma.$queryRaw<{ date: string; accounts: number }[]>(Prisma.sql`
    WITH accts AS (
      SELECT "accountId", MIN("date") AS first_date
      FROM "AdsSyncProgress"
      WHERE "date" >= ${from}
      GROUP BY 1
      HAVING MAX("syncedAt") >= NOW() - INTERVAL '3 days'
    ),
    days AS (
      SELECT to_char(d, 'YYYY-MM-DD') AS date
      FROM generate_series(${from}::date, ${to}::date, interval '1 day') d
    )
    SELECT days.date, COUNT(*)::int AS accounts
    FROM days
    JOIN accts ON accts.first_date <= days.date
    LEFT JOIN "AdsSyncProgress" p
      ON p."accountId" = accts."accountId" AND p."date" = days.date
     AND p."syncedAt" >= (days.date::date + 1)
    WHERE p."accountId" IS NULL
    GROUP BY days.date
    ORDER BY days.date
  `);

  if (gaps.length === 0) {
    return NextResponse.json({ message: "No missing days", from, to });
  }

  const since = gaps[0].date;
  const capEnd = new Date(Date.parse(`${since}T00:00:00Z`) + (BACKFILL_MAX_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  const until = capEnd < to ? capEnd : to;
  console.log(JSON.stringify({ event: "meta_ads_backfill", since, until, gaps }));

  const url = new URL(req.url);
  url.pathname = "/api/cron/sync-ads";
  url.search = new URLSearchParams({ since, until }).toString();
  // Forward the original headers so the sync route performs its own auth check.
  return runSync(new NextRequest(url, { headers: req.headers }));
}
