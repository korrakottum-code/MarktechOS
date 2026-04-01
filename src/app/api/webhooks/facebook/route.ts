import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/server/prisma";
import { MetaApiClient, parseMetaFields } from "@/lib/server/facebook-api";

/**
 * GET Handler: Facebook Webhook Verification
 * Used by Meta to verify that this server is authorized to receive webhooks.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN || "MARTECH_LEADS_SECURE_2024";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Facebook Webhook Verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("❌ Facebook Webhook Verification failed. Token mismatch.");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST Handler: Facebook Event Processing
 * Receives lead notifications and ad spend updates.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  // Security: Verify signature if APP_SECRET is provided
  if (process.env.META_APP_SECRET && signature) {
    const expectedSignature = `sha256=${createHmac("sha256", process.env.META_APP_SECRET)
      .update(body)
      .digest("hex")}`;
    
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle leadgen notifications
  // Structure: entry[] -> changes[] -> value -> leadgen_id, page_id
  const entries = payload.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === "leadgen") {
        const { leadgen_id, page_id } = change.value;
        console.log(`📩 New Lead detected: Page ${page_id}, ID ${leadgen_id}`);

        try {
          // 1. Fetch full details from Graph API
          const leadData = await MetaApiClient.getLeadDetails(leadgen_id);
          const parsed = parseMetaFields(leadData.field_data);

          // 2. Map page_id to Clinic
          const clinic = await prisma.clinic.findUnique({
            where: { facebookPageId: page_id },
          });

          if (!clinic) {
            console.warn(`⚠️ Received lead for unmapped Page ID: ${page_id}`);
            continue;
          }

          // 3. Create Lead in Prisma
          const newLead = await prisma.lead.create({
            data: {
              name: parsed.name || "Unknown Customer",
              phone: parsed.phone || "No Phone",
              channel: "facebook",
              clinicName: clinic.name,
              procedure: "Lead Ads", // Default placeholder
              status: "new",
              notes: `Source: Facebook Lead Ads (Form ID: ${leadData.form_id})`,
            },
          });

          // 4. Trigger Real-time Notification
          await prisma.appNotification.create({
            data: {
              type: "lead",
              title: "🆕 New Facebook Lead!",
              message: `ลูกค้า ${newLead.name} สนใจคลินิก ${clinic.name}`,
              role: "admin", // Notify admins
              time: new Date().toLocaleTimeString(),
            },
          });

          console.log(`✅ Lead ${newLead.id} created successfully for ${clinic.name}`);
        } catch (error) {
          console.error("❌ Failed to process lead:", error);
        }
      }
    }
  }

  // Acknowledge receipt to Facebook
  return NextResponse.json({ received: true });
}
