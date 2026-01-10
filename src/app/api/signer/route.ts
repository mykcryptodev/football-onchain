import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/server/db";
import { neynarSigners } from "@/server/db/schema";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY || "" });
const client = new NeynarAPIClient(config);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get("fid");

    console.log("[Signer API] Request received for FID:", fidParam);

    if (!fidParam) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 },
      );
    }

    const fid = parseInt(fidParam, 10);
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "FID must be a valid number" },
        { status: 400 },
      );
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.error("[Signer API] NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 },
      );
    }

    if (!process.env.DATABASE_URL) {
      console.error("[Signer API] DATABASE_URL not configured");
      return NextResponse.json(
        { error: "Database URL not configured" },
        { status: 500 },
      );
    }

    console.log("[Signer API] Checking for existing signer...");

    // Check if there's an existing signer for this FID
    const existingSigner = await db.query.neynarSigners.findFirst({
      where: eq(neynarSigners.fid, fid),
    });

    console.log("[Signer API] Existing signer:", existingSigner ? "found" : "not found");

    if (existingSigner) {
      // Check the signer status with Neynar
      try {
        const signerStatus = await client.lookupSigner({
          signerUuid: existingSigner.signerUuid,
        });

        // Update status in database if it changed
        if (signerStatus.status !== existingSigner.status) {
          await db
            .update(neynarSigners)
            .set({
              status: signerStatus.status,
              updatedAt: new Date(),
            })
            .where(eq(neynarSigners.fid, fid));
        }

        if (signerStatus.status === "approved") {
          return NextResponse.json({
            status: "approved",
            signerUuid: existingSigner.signerUuid,
          });
        } else {
          // For any non-approved status (pending_approval, generated, etc.)
          // Return the approval URL
          const approvalUrl = `https://client.warpcast.com/deeplinks/signed-key-request?token=${existingSigner.signerUuid}`;
          return NextResponse.json({
            status: "pending_approval",
            approvalUrl: approvalUrl,
          });
        }
      } catch (error) {
        console.error("Error looking up signer:", error);
        // If lookup fails, still return the existing signer with approval URL
        const approvalUrl = `https://client.warpcast.com/deeplinks/signed-key-request?token=${existingSigner.signerUuid}`;
        return NextResponse.json({
          status: "pending_approval",
          approvalUrl: approvalUrl,
        });
      }
    }

    // Create a new signer
    console.log("[Signer API] Creating new signer...");
    const newSigner = await client.createSigner();
    console.log("[Signer API] Signer created:", newSigner.signer_uuid);

    // Construct the Warpcast deep link for signer approval
    // This URL will open in Warpcast and prompt the user to approve the signer
    const approvalUrl = `https://client.warpcast.com/deeplinks/signed-key-request?token=${newSigner.signer_uuid}`;
    console.log("[Signer API] Approval URL:", approvalUrl);

    // Store in database
    console.log("[Signer API] Storing signer in database...");
    await db.insert(neynarSigners).values({
      fid,
      signerUuid: newSigner.signer_uuid,
      status: "pending_approval",
    });
    console.log("[Signer API] Signer stored successfully");

    // Return the approval URL for the user to approve in Warpcast
    // The managed signer will automatically register the signed key after approval
    return NextResponse.json({
      status: "pending_approval",
      approvalUrl: approvalUrl,
    });
  } catch (error) {
    console.error("[Signer API] Error:", error);
    console.error("[Signer API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to manage signer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
