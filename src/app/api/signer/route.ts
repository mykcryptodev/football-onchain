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

    if (!fidParam) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const fid = parseInt(fidParam, 10);
    if (isNaN(fid)) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 },
      );
    }

    // Check if user already has a signer in the database
    const existingSigner = await db.query.neynarSigners.findFirst({
      where: eq(neynarSigners.fid, fid),
    });

    if (existingSigner) {
      // Check the signer status with Neynar
      try {
        const signerStatus = await client.lookupSigner(
          existingSigner.signerUuid,
        );

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
        } else if (signerStatus.status === "pending_approval") {
          return NextResponse.json({
            status: "pending_approval",
            approvalUrl: signerStatus.signer_approval_url,
          });
        }
      } catch (error) {
        console.error("Error checking signer status:", error);
        // If signer lookup fails, create a new one
      }
    }

    // Create a new signer
    const newSigner = await client.createSigner();

    // Store in database
    await db.insert(neynarSigners).values({
      fid,
      signerUuid: newSigner.signer_uuid,
      status: "pending_approval",
    });

    // Register the signed key with the user's FID
    await client.registerSignedKey(newSigner.signer_uuid, fid);

    return NextResponse.json({
      status: "pending_approval",
      approvalUrl: newSigner.signer_approval_url,
    });
  } catch (error) {
    console.error("Error in signer route:", error);

    return NextResponse.json(
      {
        error: "Failed to manage signer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
