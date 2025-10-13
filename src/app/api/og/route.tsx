import { ImageResponse } from "next/og";

export const runtime = "edge";

// Cache the OG image for 1 hour, revalidate in background
export const revalidate = 3600;

export async function GET() {
  try {
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
            backgroundColor: "#0a0a0a",
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(75, 75, 75, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(75, 75, 75, 0.15) 0%, transparent 50%)",
            padding: "50px 60px 45px 60px",
            fontFamily: "Segment, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "45px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "44px",
                }}
              >
                🏈
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "48px",
                    fontWeight: "700",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Football
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    color: "#9ca3af",
                    marginTop: "-4px",
                  }}
                >
                  Blockchain-Powered Contests
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "40px",
              flex: 1,
            }}
          >
            {/* Hero Message */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px",
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
                borderRadius: "24px",
                border: "2px solid rgba(168, 85, 247, 0.2)",
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: "68px",
                  fontWeight: "700",
                  color: "#ffffff",
                  textAlign: "center",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  marginBottom: "12px",
                }}
              >
                Football
              </span>
              <span
                style={{
                  fontSize: "68px",
                  fontWeight: "700",
                  color: "#ffffff",
                  textAlign: "center",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                }}
              >
                Squares & Pick&apos;em
              </span>
            </div>

            {/* Features Grid */}
            <div
              style={{
                display: "flex",
                gap: "24px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "32px 24px",
                  backgroundColor: "rgba(31, 41, 55, 0.6)",
                  borderRadius: "16px",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "42px",
                    marginBottom: "14px",
                  }}
                >
                  🎯
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  Fair & Transparent
                </span>
                <span
                  style={{
                    fontSize: "17px",
                    color: "#9ca3af",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  Chainlink oracles fetch game results
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "32px 24px",
                  backgroundColor: "rgba(31, 41, 55, 0.6)",
                  borderRadius: "16px",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "42px",
                    marginBottom: "14px",
                  }}
                >
                  ⚡
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  Automated Payouts
                </span>
                <span
                  style={{
                    fontSize: "17px",
                    color: "#9ca3af",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  Receieve prizes permissionlessly
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "32px 24px",
                  backgroundColor: "rgba(31, 41, 55, 0.6)",
                  borderRadius: "16px",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "42px",
                    marginBottom: "14px",
                  }}
                >
                  🚀
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  Easy Contest Setup
                </span>
                <span
                  style={{
                    fontSize: "17px",
                    color: "#9ca3af",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  Create with any token in seconds
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(75, 85, 99, 0.3)",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                color: "#9ca3af",
              }}
            >
              Built by myk.eth
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
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
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Error generating image", { status: 500 });
  }
}
