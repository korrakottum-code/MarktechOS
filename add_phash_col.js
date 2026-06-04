const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "AdsContentDaily" ADD COLUMN IF NOT EXISTS "perceptualHash" TEXT DEFAULT ''`);
    console.log('✅ perceptualHash column added');
  } catch (e) {
    console.log('Column may already exist:', e.message);
  }
  await p.$disconnect();
})();
