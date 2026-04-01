import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { MetaApiClient } from "@/lib/server/facebook-api";

/**
 * GET Handler: Sync Ad Spend for all clinics
 * Can be triggered via a cron job or manually from the dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📊 Starting Ad Spend Synchronization...");
    
    // 1. Fetch all clinics that have a Facebook Ad Account ID mapped
    const clinics = await (prisma as any).clinic.findMany({
      where: {
        facebookAdAccountId: { not: null },
      },
    });

    const results = [];

    for (const clinic of clinics) {
      if (!clinic.facebookAdAccountId) continue;

      try {
        // 2. Fetch real-time spend from Meta API
        const spend = await MetaApiClient.getAdAccountSpend(clinic.facebookAdAccountId);
        
        // 3. Update the Clinic record
        await (prisma as any).clinic.update({
          where: { id: clinic.id },
          data: { adSpend: spend },
        });

        // 4. Update the AdBudgetWallet record for finance tracking
        // Note: Wallet usually tracks budget vs spent
        const wallet = await (prisma as any).adBudgetWallet.findFirst({
          where: { clinicName: clinic.name },
        });

        if (wallet) {
          await (prisma as any).adBudgetWallet.update({
            where: { id: wallet.id },
            data: { 
              usedAdSpend: spend,
              remainingAdBudget: wallet.adWalletBalance - spend,
            },
          });
        }

        results.push({ clinic: clinic.name, spend, status: "success" });
      } catch (error) {
        console.error(`❌ Failed to sync spend for ${clinic.name}:`, error);
        results.push({ clinic: clinic.name, error: String(error), status: "failed" });
      }
    }

    return NextResponse.json({ 
      message: `Sync completed. Processed ${clinics.length} clinics.`,
      results 
    });
  } catch (error) {
    console.error("❌ Global Sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
