-- Per-account, per-day record of when a sync last fetched that day successfully.
-- Lets the backfill cron find days that were never fully synced (e.g. days the
-- daily cron did not run) and fetch them again.
CREATE TABLE IF NOT EXISTS "AdsSyncProgress" (
  "accountId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdsSyncProgress_pkey" PRIMARY KEY ("accountId", "date")
);

CREATE INDEX IF NOT EXISTS "AdsSyncProgress_date_idx" ON "AdsSyncProgress" ("date");

-- Non-fatal data-quality notes from a run (suspicious delivery, zero-overwrite guard).
ALTER TABLE "AdsSyncRun" ADD COLUMN IF NOT EXISTS "warnings" TEXT NOT NULL DEFAULT '';

-- Seed from history so existing days are not treated as missing.
-- 1) Every account/day that has data, stamped with when that row was last written.
INSERT INTO "AdsSyncProgress" ("accountId", "date", "syncedAt")
SELECT "adAccountId", "date", MAX("updatedAt")
FROM "AdsMetricDaily"
WHERE "adAccountId" <> '' AND "date" >= to_char(CURRENT_DATE - 60, 'YYYY-MM-DD')
GROUP BY 1, 2
ON CONFLICT ("accountId", "date") DO UPDATE SET "syncedAt" = GREATEST("AdsSyncProgress"."syncedAt", EXCLUDED."syncedAt");

-- 2) Days covered by a clean full sync, for every known account (covers days an account spent nothing).
INSERT INTO "AdsSyncProgress" ("accountId", "date", "syncedAt")
SELECT a."adAccountId", to_char(d, 'YYYY-MM-DD'), MAX(r."completedAt")
FROM "AdsSyncRun" r
CROSS JOIN LATERAL generate_series(r."since"::date, r."until"::date, interval '1 day') d
CROSS JOIN (
  SELECT DISTINCT "adAccountId" FROM "AdsMetricDaily"
  WHERE "adAccountId" <> '' AND "date" >= to_char(CURRENT_DATE - 60, 'YYYY-MM-DD')
) a
WHERE r."status" = 'completed' AND r."accountsFailed" = 0 AND r."accountsTotal" >= 50
  AND r."completedAt" IS NOT NULL AND r."since" >= to_char(CURRENT_DATE - 60, 'YYYY-MM-DD')
GROUP BY 1, 2
ON CONFLICT ("accountId", "date") DO UPDATE SET "syncedAt" = GREATEST("AdsSyncProgress"."syncedAt", EXCLUDED."syncedAt");
