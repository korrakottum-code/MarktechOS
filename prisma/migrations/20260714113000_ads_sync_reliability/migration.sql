-- Reliability primitives and query indexes for the Ads sync pipeline.
CREATE INDEX IF NOT EXISTS "AdsMetricDaily_pageId_date_idx"
  ON "AdsMetricDaily" ("pageId", "date");

CREATE INDEX IF NOT EXISTS "AdsContentDaily_pageId_date_idx"
  ON "AdsContentDaily" ("pageId", "date");

CREATE TABLE IF NOT EXISTS "AdsSyncRun" (
  "id" TEXT NOT NULL,
  "since" TEXT NOT NULL,
  "until" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "accountsTotal" INTEGER NOT NULL DEFAULT 0,
  "accountsFailed" INTEGER NOT NULL DEFAULT 0,
  "campaignRows" INTEGER NOT NULL DEFAULT 0,
  "contentRows" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT NOT NULL DEFAULT '',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AdsSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdsSyncRun_status_startedAt_idx"
  ON "AdsSyncRun" ("status", "startedAt");

CREATE TABLE IF NOT EXISTS "AdsSyncLock" (
  "key" TEXT NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdsSyncLock_pkey" PRIMARY KEY ("key")
);
