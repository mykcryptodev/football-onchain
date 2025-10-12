import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pick'em Contest";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// This is a fallback OG image that Next.js will use
// The actual dynamic OG image is at /api/og/pickem/[contestId]
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Load custom fonts from public folder
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [fontMedium, fontBold] = await Promise.all([
    fetch(`${baseUrl}/fonts/Segment/Segment-Medium.otf`).then(res =>
      res.arrayBuffer(),
    ),
    fetch(`${baseUrl}/fonts/Segment/Segment-Bold.otf`).then(res =>
      res.arrayBuffer(),
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(75, 75, 75, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(75, 75, 75, 0.15) 0%, transparent 50%)",
          padding: "60px 80px",
          fontFamily: "Segment, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}
          >
            🏈
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Football
            </span>
            <span
              style={{
                fontSize: "28px",
                color: "#9ca3af",
                marginTop: "-8px",
              }}
            >
              Pick'em Contest #{id}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 80px",
            background:
              "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
            borderRadius: "24px",
            border: "2px solid rgba(168, 85, 247, 0.2)",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              color: "#d1d5db",
              marginBottom: "16px",
            }}
          >
            Join the Contest
          </span>
          <span
            style={{
              fontSize: "24px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            Blockchain-powered fair play • Instant payouts
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Segment",
          data: fontMedium,
          style: "normal",
          weight: 500,
        },
        {
          name: "Segment",
          data: fontBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
