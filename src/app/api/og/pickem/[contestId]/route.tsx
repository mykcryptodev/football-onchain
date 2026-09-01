import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract, readContract } from "thirdweb";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { shortenLargeNumber, toTokens } from "thirdweb/utils";
import { erc20Abi } from "viem";

import { chain, pickem, pickemNFT } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { abi as pickemNFTAbi } from "@/constants/abis/pickemNFT";
import { loadPickemOgFonts, renderPickemOgCard } from "@/lib/og/pickem-card";
import {
  formatEntriesLabel,
  formatPlayersLabel,
  isEnteredShare,
  parsePickemOgRatio,
  PICKEM_ENTERED_PARAM,
  PICKEM_OG_RATIO_PARAM,
  PICKEM_OG_SIZES,
} from "@/lib/pickem-share";
import { client } from "@/providers/Thirdweb";

export const runtime = "edge";

// Reading search params opts this route out of the segment cache, so the
// caching contract lives on the response instead.
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

// Resolving the unique player count costs one `ownerOf` per entry. Past this
// many entries the card drops the players chip rather than stall a crawler.
const MAX_OWNER_LOOKUPS = 40;

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

/** Mirrors `useFormattedCurrency` so the card matches the homepage section. */
async function formatPrizePool(
  amount: bigint,
  currencyAddress: string,
): Promise<string> {
  const contract = getContract({
    client,
    chain,
    address: currencyAddress as `0x${string}`,
    abi: erc20Abi,
  });

  const metadata = await getCurrencyMetadata({ contract });
  const amountFormatted = Number(toTokens(amount, metadata.decimals));

  return `${shortenLargeNumber(amountFormatted).toLocaleString()} ${metadata.symbol}`;
}

async function countUniquePlayers(contestId: bigint): Promise<number | null> {
  const pickemContract = getContract({
    client,
    chain,
    address: pickem[chain.id],
    abi: pickemAbi,
  });

  const tokenIds = await readContract({
    contract: pickemContract,
    method: "getContestTokenIds",
    params: [contestId],
  });

  if (tokenIds.length > MAX_OWNER_LOOKUPS) return null;

  const nftContract = getContract({
    client,
    chain,
    address: pickemNFT[chain.id],
    abi: pickemNFTAbi,
  });

  const owners = await Promise.all(
    tokenIds.map(tokenId =>
      readContract({
        contract: nftContract,
        method: "ownerOf",
        params: [tokenId],
      }),
    ),
  );

  return new Set(owners.map(owner => owner.toLowerCase())).size;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  const contestIdNum = parseInt(contestId);

  if (isNaN(contestIdNum)) {
    return new Response("Invalid contest ID", { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const ratio = parsePickemOgRatio(
    searchParams.get(PICKEM_OG_RATIO_PARAM) ?? undefined,
  );
  const entered = isEnteredShare(
    searchParams.get(PICKEM_ENTERED_PARAM) ?? undefined,
  );

  // Placeholders mirror the homepage card's loading state, so a failed read
  // still produces a valid, on-brand image instead of a broken preview.
  let weekNumber = 0;
  let seasonTypeName = "Season";
  let year = new Date().getFullYear();
  let prizePool = "—";
  let entriesLabel = "Contest unavailable";
  let playersLabel: string | null = null;

  try {
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

    weekNumber = contestData.weekNumber;
    seasonTypeName = getSeasonTypeName(contestData.seasonType);
    year = Number(contestData.year);
    entriesLabel = formatEntriesLabel(Number(contestData.totalEntries));

    const [prizePoolResult, playersResult] = await Promise.allSettled([
      formatPrizePool(contestData.totalPrizePool, contestData.currency),
      countUniquePlayers(BigInt(contestIdNum)),
    ]);

    if (prizePoolResult.status === "fulfilled") {
      prizePool = prizePoolResult.value;
    } else {
      console.error("Error formatting prize pool:", prizePoolResult.reason);
    }

    if (playersResult.status === "fulfilled" && playersResult.value !== null) {
      playersLabel = formatPlayersLabel(playersResult.value);
    } else if (playersResult.status === "rejected") {
      console.error("Error counting players:", playersResult.reason);
    }
  } catch (error) {
    console.error("Error loading contest for OG image:", error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  return new ImageResponse(
    renderPickemOgCard({
      ratio,
      entered,
      contestId: contestIdNum,
      weekNumber,
      seasonTypeName,
      year,
      prizePool,
      entriesLabel,
      playersLabel,
    }),
    {
      ...PICKEM_OG_SIZES[ratio],
      fonts: await loadPickemOgFonts(baseUrl),
      headers: { "cache-control": CACHE_CONTROL },
    },
  );
}
