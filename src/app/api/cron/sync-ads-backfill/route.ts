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
const RETRY_COOLDOWN_HOURS = 36;

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
  // missing forever. Days before an account's first recorded day are not
  // expected either. Days already attempted in the last RETRY_COOLDOWN_HOURS
  // (by any run, including one cut off by the time limit) are skipped so one
  // stubborn day cannot pin every run to the same range.
  const gaps = await prisma.$queryRaw<{ date: string; accountIds: string[] }[]>(Prisma.sql`
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
    SELECT days.date, array_agg(accts."accountId" ORDER BY accts."accountId") AS "accountIds"
    FROM days
    JOIN accts ON accts.first_date <= days.date
    LEFT JOIN "AdsSyncProgress" p
      ON p."accountId" = accts."accountId" AND p."date" = days.date
     AND p."syncedAt" >= (days.date::date + 1)
    WHERE p."accountId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "AdsSyncRun" r
        WHERE r."startedAt" >= NOW() - (${RETRY_COOLDOWN_HOURS} * INTERVAL '1 hour')
          AND r."since" <= days.date AND r."until" >= days.date
      )
    GROUP BY days.date
    ORDER BY days.date
  `);

  if (gaps.length === 0) {
    return NextResponse.json({ message: "No missing days", from, to });
  }

  // Oldest missing day, extended over up to BACKFILL_MAX_DAYS consecutive
  // missing days; only the accounts missing in that range are re-fetched.
  const since = gaps[0].date;
  const capEnd = new Date(Date.parse(`${since}T00:00:00Z`) + (BACKFILL_MAX_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  const chosen = gaps.filter(g => g.date <= capEnd);
  const until = chosen[chosen.length - 1].date;
  const accountIds = [...new Set(chosen.flatMap(g => g.accountIds))];
  console.log(JSON.stringify({ event: "meta_ads_backfill", since, until, accounts: accountIds.length, gapDays: gaps.length }));

  const url = new URL(req.url);
  url.pathname = "/api/cron/sync-ads";
  url.search = new URLSearchParams({ since, until, accounts: accountIds.join(",") }).toString();
  // Forward the original headers so the sync route performs its own auth check.
  return runSync(new NextRequest(url, { headers: req.headers }));
}
