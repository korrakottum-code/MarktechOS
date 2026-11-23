-- Manual service/price per ad name, and ad copy used to infer the service.
CREATE TABLE IF NOT EXISTS "AdServiceMap" (
  "nameKey" TEXT NOT NULL,
  "service" TEXT NOT NULL DEFAULT '',
  "price" INTEGER,
  "exclude" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdServiceMap_pkey" PRIMARY KEY ("nameKey")
);

CREATE TABLE IF NOT EXISTS "AdCreativeText" (
  "adId" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdCreativeText_pkey" PRIMARY KEY ("adId")
);

ALTER TABLE "AdServiceMap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdCreativeText" ENABLE ROW LEVEL SECURITY;
