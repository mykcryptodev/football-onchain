import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY || "" });
const client = new NeynarAPIClient(config);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");

    // Construct the parent URL for this contest
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const parentUrl = `${baseUrl}/contest/${contestId}`;

    // Check if API key is configured
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 },
      );
    }

    // Fetch casts with this parent URL from Neynar
    const response = await client.fetchFeedByParentUrls({
      parentUrls: [parentUrl],
      limit: 25,
      withReplies: true,
      ...(cursor ? { cursor } : {}),
    });

    return NextResponse.json({
      casts: response.casts,
      next: response.next,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);

    // Handle specific Neynar errors
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        // No comments found yet - this is normal
        return NextResponse.json({
          casts: [],
          next: { cursor: null },
        });
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch comments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
