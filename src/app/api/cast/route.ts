import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY || "" });
const client = new NeynarAPIClient(config);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, parentUrl, signerUuid } = body;

    // Validate required fields
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 },
      );
    }

    if (!parentUrl || typeof parentUrl !== "string") {
      return NextResponse.json(
        { error: "Parent URL is required and must be a string" },
        { status: 400 },
      );
    }

    if (!signerUuid || typeof signerUuid !== "string") {
      return NextResponse.json(
        { error: "Signer UUID is required and must be a string" },
        { status: 400 },
      );
    }

    // Check if API key is configured
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 },
      );
    }

    // Publish the cast with parent URL
    const cast = await client.publishCast({
      signerUuid,
      text,
      parent: parentUrl,
    });

    return NextResponse.json({
      success: true,
      cast,
    });
  } catch (error) {
    console.error("Error posting cast:", error);

    // Handle specific Neynar errors
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as {
        response?: { status?: number; data?: unknown };
      };
      if (apiError.response?.status === 403) {
        return NextResponse.json(
          {
            error: "Signer not approved or invalid",
            details:
              "The signer needs to be approved in Warpcast before posting casts",
          },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to post cast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
