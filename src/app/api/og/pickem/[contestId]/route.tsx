import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract, readContract } from "thirdweb";
import { getSocialProfiles } from "thirdweb/social";

import { chain, pickem, pickemNFT } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { abi as pickemNFTAbi } from "@/constants/abis/pickemNFT";
import { resolveTokenIcon } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

export const runtime = "edge";

// Cache the OG image for 1 hour, revalidate in background
export const revalidate = 3600;

interface TokenData {
  decimals: number;
  priceUsd: number;
  symbol: string;
  address: string;
  iconUri?: string;
}

function getSeasonTypeName(seasonType: number): string {
  switch (seasonType) {
    case 1:
      return "Preseason";
    case 2:
      return "Regular Season";
    case 3:
      return "Postseason";
    default:
      return "Season";
  }
}

// Generate a deterministic color gradient from an Ethereum address
function getAddressColors(address: string): [string, string] {
  // Use the address to generate a unique hue
  const hash = address.toLowerCase().slice(2); // Remove 0x
  const hue = parseInt(hash.slice(0, 8), 16) % 360;

  // Generate vibrant colors with good contrast
  const saturation = 65 + (parseInt(hash.slice(8, 10), 16) % 20);
  const lightness1 = 55 + (parseInt(hash.slice(10, 12), 16) % 15);
  const lightness2 = lightness1 - 15;

  return [
    `hsl(${hue}, ${saturation}%, ${lightness1}%)`,
    `hsl(${hue}, ${saturation}%, ${lightness2}%)`,
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;
    const contestIdNum = parseInt(contestId);

    if (isNaN(contestIdNum)) {
      return new Response("Invalid contest ID", { status: 400 });
    }

    // Fetch contest data
    const pickemContract = getContract({
      client,
      chain,
      address: pickem[chain.id],
      abi: pickemAbi,
    });

    const contestData = await readContract({
      contract: pickemContract,
      method: "getContest",
      params: [BigInt(contestIdNum)],
    });

    if (!contestData) {
      return new Response("Contest not found", { status: 404 });
    }

    // Fetch token data for USD conversion
    let tokenData: TokenData | null = null;
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const tokenResponse = await fetch(
        `${baseUrl}/api/tokens?chainId=${chain.id}&name=${contestData.currency}`,
        { cache: "no-store" },
      );

      if (tokenResponse.ok) {
        const tokenJson = await tokenResponse.json();
        if (tokenJson.result?.tokens?.length > 0) {
          const token = tokenJson.result.tokens[0];
          tokenData = {
            decimals: token.decimals,
            priceUsd: token.priceUsd,
            symbol: token.symbol,
            address: token.address,
            iconUri: token.iconUri,
          };
        }
      }
    } catch (error) {
      console.error("Error fetching token data:", error);
    }

    // Resolve token icon
    let tokenIconUrl: string | undefined;
    if (tokenData) {
      try {
        tokenIconUrl = await resolveTokenIcon({
          chainId: chain.id,
          address: tokenData.address,
          decimals: tokenData.decimals,
          symbol: tokenData.symbol,
          name: tokenData.symbol,
          priceUsd: tokenData.priceUsd,
          iconUri: tokenData.iconUri || "",
          prices: { usd: tokenData.priceUsd },
        });
      } catch (error) {
        console.error("Error resolving token icon:", error);
      }
    }

    // Calculate values
    const entryFeeInTokens = tokenData
      ? Number(contestData.entryFee) / Math.pow(10, tokenData.decimals)
      : 0;
    const prizePoolInTokens = tokenData
      ? Number(contestData.totalPrizePool) / Math.pow(10, tokenData.decimals)
      : 0;
    const entryFeeUsd = tokenData ? entryFeeInTokens * tokenData.priceUsd : 0;
    const prizePoolUsd = tokenData ? prizePoolInTokens * tokenData.priceUsd : 0;

    const seasonTypeName = getSeasonTypeName(contestData.seasonType);
    const totalEntries = Number(contestData.totalEntries);
    const weekNumber = contestData.weekNumber;
    const year = Number(contestData.year);

    // Fetch token IDs and owners for this contest
    let participantData: Array<{
      address: string;
      avatar?: string;
      name?: string;
    }> = [];
    try {
      const tokenIds = await readContract({
        contract: pickemContract,
        method: "getContestTokenIds",
        params: [BigInt(contestIdNum)],
      });

      const nftContract = getContract({
        client,
        chain,
        address: pickemNFT[chain.id],
        abi: pickemNFTAbi,
      });

      // Get owners for up to 8 token IDs
      const ownersToFetch = tokenIds.slice(0, 8);
      const ownerPromises = ownersToFetch.map(tokenId =>
        readContract({
          contract: nftContract,
          method: "ownerOf",
          params: [tokenId],
        }),
      );

      const participantAddresses = await Promise.all(ownerPromises);

      // Fetch social profiles for each participant
      const profilePromises = participantAddresses.map(async address => {
        try {
          const profiles = await getSocialProfiles({
            address: address as `0x${string}`,
            client,
          });

          // Prioritize ENS, then Farcaster, then Lens
          const ensProfile = profiles.find(p => p.type === "ens");
          const farcasterProfile = profiles.find(p => p.type === "farcaster");
          const lensProfile = profiles.find(p => p.type === "lens");

          const profile = ensProfile || farcasterProfile || lensProfile;

          return {
            address,
            avatar: profile?.avatar,
            name: profile?.name,
          };
        } catch (error) {
          console.error(`Error fetching profile for ${address}:`, error);
          return { address };
        }
      });

      participantData = await Promise.all(profilePromises);
    } catch (error) {
      console.error("Error fetching participants:", error);
      // Continue without participant data
    }

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
            padding: "45px 60px 40px 60px",
            fontFamily: "Segment, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                }}
              >
                🏈
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Football
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    color: "#9ca3af",
                    marginTop: "-4px",
                  }}
                >
                  Pick&apos;em Contest
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "#ffffff",
                }}
              >
                {seasonTypeName}
              </span>
              <span
                style={{
                  fontSize: "20px",
                  color: "#9ca3af",
                  marginTop: "-2px",
                }}
              >
                {year} • Week {weekNumber}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Prize Pool - Hero */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 48px",
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
                borderRadius: "20px",
                border: "2px solid rgba(168, 85, 247, 0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  color: "#d1d5db",
                  fontWeight: "500",
                  marginBottom: "10px",
                }}
              >
                Prize Pool
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "72px",
                    fontWeight: "700",
                    color: "#ffffff",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  ${prizePoolUsd.toFixed(2)}
                </span>
                {tokenData && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    {tokenIconUrl && (
                      <img
                        alt={tokenData.symbol}
                        height="20"
                        src={tokenIconUrl}
                        width="20"
                        style={{
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "22px",
                        color: "#9ca3af",
                      }}
                    >
                      {prizePoolInTokens.toFixed(2)} {tokenData.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "flex",
                gap: "20px",
              }}
            >
              {/* Entry Fee */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                  backgroundColor: "rgba(31, 41, 55, 0.6)",
                  borderRadius: "14px",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "#9ca3af",
                    marginBottom: "10px",
                  }}
                >
                  Entry Fee
                </span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "36px",
                      fontWeight: "700",
                      color: "#ffffff",
                      lineHeight: 1,
                    }}
                  >
                    ${entryFeeUsd.toFixed(2)}
                  </span>
                  {tokenData && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "6px",
                      }}
                    >
                      {tokenIconUrl && (
                        <img
                          alt={tokenData.symbol}
                          height="16"
                          src={tokenIconUrl}
                          width="16"
                          style={{
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: "16px",
                          color: "#6b7280",
                        }}
                      >
                        {entryFeeInTokens.toFixed(2)} {tokenData.symbol}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Entries */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                  backgroundColor: "rgba(31, 41, 55, 0.6)",
                  borderRadius: "14px",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "#9ca3af",
                    marginBottom: "10px",
                  }}
                >
                  Total Entries
                </span>
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: "700",
                    color: "#ffffff",
                    lineHeight: 1,
                    marginBottom: "12px",
                  }}
                >
                  {totalEntries}
                </span>
                {/* Overlapping Avatars - Real Participants with Social Profiles */}
                {totalEntries > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: "4px",
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(index => {
                      if (index >= totalEntries) return null;

                      // Use real participant data if available, otherwise use placeholder
                      const participant = participantData[index] || {
                        address: `0x${index.toString().padStart(40, "0")}`,
                      };
                      const { address, avatar } = participant;
                      const [color1, color2] = getAddressColors(address);

                      // If we have an avatar URL, render as image
                      if (avatar) {
                        return (
                          <div
                            key={index}
                            style={{
                              width: "35px",
                              height: "35px",
                              borderRadius: "50%",
                              border: "2px solid rgba(31, 41, 55, 0.9)",
                              marginLeft: index === 0 ? "0" : "-8px",
                              overflow: "hidden",
                              display: "flex",
                            }}
                          >
                            <img
                              alt="Avatar"
                              height="35"
                              src={avatar}
                              width="35"
                              style={{
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        );
                      }

                      // Fallback: show address-based color gradient
                      const shortAddress =
                        `${address.slice(2, 4)}${address.slice(-2)}`.toUpperCase();

                      return (
                        <div
                          key={index}
                          style={{
                            width: "35px",
                            height: "35px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                            border: "2px solid rgba(31, 41, 55, 0.9)",
                            marginLeft: index === 0 ? "0" : "-8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "700",
                            color: "#ffffff",
                            letterSpacing: "-0.5px",
                          }}
                        >
                          {shortAddress}
                        </div>
                      );
                    })}
                    {totalEntries > 8 && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          marginLeft: "8px",
                          fontWeight: "500",
                        }}
                      >
                        +{totalEntries - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "24px",
              paddingTop: "18px",
              borderTop: "1px solid rgba(75, 85, 99, 0.3)",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                color: "#6b7280",
              }}
            >
              Contest #{contestIdNum}
            </span>
            <span
              style={{
                fontSize: "18px",
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
        height: 630,
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
