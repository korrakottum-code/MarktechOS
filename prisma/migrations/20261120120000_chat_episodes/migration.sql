-- Chat outcomes read from Pancake: one row per chat episode, no personal data.
CREATE TABLE IF NOT EXISTS "ChatEpisode" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "convHash" TEXT NOT NULL,
  "adId" TEXT NOT NULL DEFAULT '',
  "adTitle" TEXT NOT NULL DEFAULT '',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "date" TEXT NOT NULL,
  "hour" INTEGER NOT NULL,
  "isNew" BOOLEAN NOT NULL DEFAULT true,
  "closed" BOOLEAN NOT NULL DEFAULT false,
  "closedAt" TIMESTAMP(3),
  "queues" INTEGER NOT NULL DEFAULT 0,
  "phoneGiven" BOOLEAN NOT NULL DEFAULT false,
  "lastActivityAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatEpisode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatEpisode_pageId_date_idx" ON "ChatEpisode" ("pageId", "date");
CREATE INDEX IF NOT EXISTS "ChatEpisode_convHash_startedAt_idx" ON "ChatEpisode" ("convHash", "startedAt");
CREATE INDEX IF NOT EXISTS "ChatEpisode_date_idx" ON "ChatEpisode" ("date");

CREATE TABLE IF NOT EXISTS "ChatSyncState" (
  "pageId" TEXT NOT NULL,
  "cursor" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "lastError" TEXT NOT NULL DEFAULT '',
  "convsTotal" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatSyncState_pkey" PRIMARY KEY ("pageId")
);

-- Supabase exposes public tables over its REST API; keep these server-only.
ALTER TABLE "ChatEpisode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatSyncState" ENABLE ROW LEVEL SECURITY;
