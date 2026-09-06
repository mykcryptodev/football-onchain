import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  type Hex,
  http,
  isAddress,
  parseAbi,
  zeroAddress,
} from "viem";
import { base } from "viem/chains";

import { chain, featuredPickemContestIds, pickem } from "@/constants";
import { abi } from "@/constants/abis/pickem";
import { getBaseUrl } from "@/lib/farcaster-metadata";

import {
  type Matchup,
  parsePicks,
  pickTemplate,
  settlementStep,
} from "./picks";

export const address = pickem[chain.id] as Address;
// Read-only: Bankr signs and submits every write. No reporter key or wallet API key here.
export const rpc = createPublicClient({
  chain: base,
  transport: http(
    process.env.ORACLE_RPC_URL ||
      (process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
        ? `https://8453.rpc.thirdweb.com/${process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}`
        : undefined),
    { timeout: 15000, retryCount: 1 },
  ),
});
const oracleAbi = parseAbi([
  "function getWeekGames(uint256,uint8,uint8) view returns (uint256[],uint256)",
  "function weekResults(uint256) view returns (uint256,uint256,uint8,bool,uint256,uint256)",
  "function fetchWeekResults(uint64,uint32,bytes32,uint256,uint8,uint8) returns (bytes32)",
]);
const nftAbi = parseAbi(["function ownerOf(uint256) view returns (address)"]);
export function uint(value: string) {
  if (!/^(0|[1-9]\d{0,19})$/.test(value))
    throw new Error("Invalid unsigned integer.");
  return BigInt(value);
}
export function wallet(value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value))
    throw new Error("A valid Bankr wallet address is required.");
  return value;
}
export const jsonSafe = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
export const contestUrl = (id: bigint) => `${getBaseUrl()}/pickem/${id}`;
export async function contest(id: bigint) {
  const c = await rpc.readContract({
    address,
    abi,
    functionName: "getContest",
    args: [id],
  });
  if (c.creator === zeroAddress || c.gameIds.length === 0)
    throw new Error("Contest not found.");
  return c;
}
type Contest = Awaited<ReturnType<typeof contest>>;
export async function matchups(c: Contest): Promise<Matchup[]> {
  // Resolve each ID, never substitute or re-sort ESPN's current weekly slate.
  return Promise.all(
    c.gameIds.map(async gameId => {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
        { next: { revalidate: 30 }, signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok)
        throw new Error("Game data unavailable. Try again shortly.");
      const data = await response.json();
      const game = data.header?.competitions?.[0];
      type Team = {
        homeAway: string;
        team?: { abbreviation?: string };
        score?: string;
      };
      const away = game?.competitors?.find(
        (t: Team) => t.homeAway === "away",
      ) as Team | undefined;
      const home = game?.competitors?.find(
        (t: Team) => t.homeAway === "home",
      ) as Team | undefined;
      if (!away?.team?.abbreviation || !home?.team?.abbreviation || !game.date)
        throw new Error("Matchup unavailable; do not guess teams.");
      return {
        gameId: gameId.toString(),
        away: away.team.abbreviation,
        home: home.team.abbreviation,
        kickoff: game.date,
        awayScore: away.score === undefined ? undefined : Number(away.score),
        homeScore: home.score === undefined ? undefined : Number(home.score),
        completed: game.status?.type?.completed === true,
      };
    }),
  );
}
export async function details(id: bigint) {
  const c = await contest(id);
  const games = await matchups(c);
  const block = await rpc.getBlock();
  let currency = { symbol: "ETH", decimals: 18 };
  if (c.currency !== zeroAddress) {
    const [symbol, decimals] = await Promise.all([
      rpc.readContract({
        address: c.currency,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      rpc.readContract({
        address: c.currency,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
    currency = { symbol, decimals };
  }
  const tiebreaker =
    games.find(g => g.gameId === c.tiebreakerGameId.toString()) ||
    [...games].sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))[0];
  return {
    contest: c,
    chainId: chain.id,
    contract: address,
    currency,
    entryFee: formatUnits(c.entryFee, currency.decimals),
    open: !c.gamesFinalized && block.timestamp < c.submissionDeadline,
    games,
    template: pickTemplate(games),
    tiebreaker: {
      gameId: tiebreaker.gameId,
      matchup: `${tiebreaker.away} vs ${tiebreaker.home}`,
      instruction:
        "Predict combined points for the latest game. If schedules change, the oracle determines the final tiebreaker game.",
    },
    links: {
      contest: contestUrl(id),
      picks: `${contestUrl(id)}/picks`,
      leaderboard: `${contestUrl(id)}#leaderboard`,
    },
  };
}
export async function entries(c: Contest, ids: readonly bigint[]) {
  const nft = await rpc.readContract({
    address,
    abi,
    functionName: "pickemNFT",
  });
  return Promise.all(
    ids.map(async tokenId => {
      const [prediction, picks] = await Promise.all([
        rpc.readContract({
          address,
          abi,
          functionName: "getUserPrediction",
          args: [tokenId],
        }),
        rpc.readContract({
          address,
          abi,
          functionName: "getUserPicks",
          args: [tokenId, c.gameIds],
        }),
      ]);
      if (prediction[0] !== c.id)
        throw new Error("Entry does not belong to contest.");
      const owner =
        nft === zeroAddress
          ? prediction[1]
          : await rpc.readContract({
              address: nft,
              abi: nftAbi,
              functionName: "ownerOf",
              args: [tokenId],
            });
      return {
        tokenId,
        predictor: prediction[1],
        owner,
        submissionTime: prediction[2],
        tiebreakerPoints: prediction[3],
        correctPicks: prediction[4],
        scoreCalculated: prediction[5],
        claimed: prediction[6],
        picks,
        url: `${contestUrl(c.id)}/entries/${tokenId}`,
      };
    }),
  );
}
export async function tokenIds(id: bigint) {
  return rpc.readContract({
    address,
    abi,
    functionName: "getContestTokenIds",
    args: [id],
  });
}
export async function entryPage(id: bigint, cursor: number, owner?: Address) {
  const c = await contest(id);
  const ids = await tokenIds(id);
  const rows = await entries(c, ids.slice(cursor, cursor + 50));
  return {
    entries: owner
      ? rows.filter(r => r.owner.toLowerCase() === owner.toLowerCase())
      : rows,
    totalEntries: ids.length,
    nextCursor: cursor + 50 < ids.length ? cursor + 50 : null,
  };
}
export async function leaderboard(id: bigint, limit = 10, cursor = 0) {
  const c = await contest(id);
  const ids = await tokenIds(id);
  if (ids.length > 5000)
    throw new Error(
      "Contest too large for a single leaderboard response; use paginated entries.",
    );
  const games = await matchups(c);
  const rows: Awaited<ReturnType<typeof entries>> = [];
  for (let i = 0; i < ids.length; i += 50)
    rows.push(...(await entries(c, ids.slice(i, i + 50))));
  const finalBoard = await rpc.readContract({
    address,
    abi,
    functionName: "getContestLeaderboard",
    args: [id],
  });
  const ranked = rows.map(row => ({
    ...row,
    liveCorrectPicks: games.reduce(
      (score, g, i) =>
        score +
        (g.completed &&
        g.homeScore !== undefined &&
        g.awayScore !== undefined &&
        g.homeScore !== g.awayScore &&
        row.picks[i] === (g.homeScore > g.awayScore ? 1 : 0)
          ? 1
          : 0),
      0,
    ),
  }));
  ranked.sort(
    (a, b) =>
      b.liveCorrectPicks - a.liveCorrectPicks ||
      Number(a.submissionTime - b.submissionTime) ||
      Number(a.tokenId - b.tokenId),
  );
  return {
    source:
      "ESPN completed games; provisional, tied scores share a rank. Contract leaderboard determines prizes after all entries are scored.",
    completedGames: games.filter(g => g.completed).length,
    totalGames: games.length,
    totalEntries: ranked.length,
    nextCursor: cursor + limit < ranked.length ? cursor + limit : null,
    entries: ranked
      .map((r, i) => ({
        ...r,
        rank:
          ranked.findIndex(
            x => x.liveCorrectPicks === ranked[i].liveCorrectPicks,
          ) + 1,
      }))
      .slice(cursor, cursor + limit),
    officialPrizePositions: finalBoard,
    allScoresCalculated: rows.every(r => r.scoreCalculated),
    payoutComplete: c.payoutComplete,
    url: contestUrl(id),
  };
}
function transaction(to: Address, data: Hex, value = BigInt(0)) {
  return { to, data, value: value.toString(), chainId: chain.id };
}
async function simulate(tx: ReturnType<typeof transaction>, account: Address) {
  await rpc.call({
    account,
    to: tx.to,
    data: tx.data,
    value: BigInt(tx.value),
  });
  return tx;
}
export async function prepareEntry(id: bigint, body: Record<string, unknown>) {
  const account = wallet(body.wallet);
  const c = await contest(id);
  const block = await rpc.getBlock();
  if (c.gamesFinalized || block.timestamp >= c.submissionDeadline)
    throw new Error("Entries are closed.");
  if (
    !Array.isArray(body.picks) ||
    body.picks.length !== c.gameIds.length ||
    !body.picks.every(p => p === 0 || p === 1)
  )
    throw new Error(
      "Provide one 0 (away) or 1 (home) pick per game, in template order.",
    );
  if (
    typeof body.tiebreakerPoints !== "number" ||
    !Number.isSafeInteger(body.tiebreakerPoints) ||
    body.tiebreakerPoints < 0
  )
    throw new Error("Provide a nonnegative integer tiebreakerPoints.");
  const existing = await rpc.readContract({
    address,
    abi,
    functionName: "getUserTokensForContest",
    args: [id, account],
  });
  if (body.expectedEntryCount !== existing.length)
    throw new Error(
      "Entry count changed or missing. Check existing entries before authorizing another paid entry.",
    );
  if (c.currency !== zeroAddress) {
    const allowance = await rpc.readContract({
      address: c.currency,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account, address],
    });
    if (allowance < c.entryFee) {
      // Tokens requiring zero-reset approvals get a separate, confirmed step.
      const amount = allowance > BigInt(0) ? BigInt(0) : c.entryFee;
      const tx = transaction(
        c.currency,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [address, amount],
        }),
      );
      return {
        step: amount === BigInt(0) ? "reset-approval" : "approve",
        transaction: await simulate(tx, account),
        entered: false,
        next: "Wait for successful receipt; call entry again with the SAME picks, tiebreaker and expectedEntryCount.",
      };
    }
  }
  const tx = transaction(
    address,
    encodeFunctionData({
      abi,
      functionName: "submitPredictions",
      args: [id, body.picks, BigInt(body.tiebreakerPoints)],
    }),
    c.currency === zeroAddress ? c.entryFee : BigInt(0),
  );
  return {
    step: "enter",
    transaction: await simulate(tx, account),
    expectedEntryCount: existing.length,
    next: "Wait for successful receipt. Read PredictionSubmitted tokenId and verify entry; do not resubmit on a timeout.",
  };
}
/** Mirrors claimAllPrizes integer arithmetic, including underfilled payout tiers. */
export async function payoutPreview(c: Contest) {
  const [board, fee, denominator, treasury] = await Promise.all([
    rpc.readContract({
      address,
      abi,
      functionName: "getContestLeaderboard",
      args: [c.id],
    }),
    rpc.readContract({ address, abi, functionName: "TREASURY_FEE" }),
    rpc.readContract({ address, abi, functionName: "PERCENT_DENOMINATOR" }),
    rpc.readContract({ address, abi, functionName: "treasury" }),
  ]);
  if (!board.length)
    throw new Error("No scored winners available; cannot verify payout.");
  const predictions = await entries(
    c,
    board.map(row => row.tokenId),
  );
  if (predictions.some(row => !row.scoreCalculated))
    throw new Error("Winner scores are incomplete; retry settlement.");
  const treasuryFee = (c.totalPrizePool * fee) / denominator;
  const afterFee = c.totalPrizePool - treasuryFee;
  const winners = predictions.map((row, index) => ({
    tokenId: row.tokenId,
    place: index + 1,
    currentOwner: row.owner,
    amount:
      (afterFee * (c.payoutStructure.payoutPercentages[index] ?? BigInt(0))) /
      denominator,
    claimed: row.claimed,
    url: row.url,
  }));
  if (c.payoutComplete && winners.some(row => !row.claimed))
    throw new Error(
      "Payout completion and winner claim state disagree; cannot verify payment.",
    );
  return {
    currency: c.currency,
    amountUnits: "Base units of currency; zero address means ETH (wei).",
    totalPrizePool: c.totalPrizePool,
    treasury,
    treasuryFee,
    winners,
    remainingWinnerPayout: winners.reduce(
      (sum, row) => sum + (row.claimed ? BigInt(0) : row.amount),
      BigInt(0),
    ),
    // The contract does not redistribute missing tiers or rounding dust.
    unallocatedPrizePool:
      afterFee - winners.reduce((sum, row) => sum + row.amount, BigInt(0)),
    allWinnersClaimed: winners.every(row => row.claimed),
    recipientNote:
      "Current NFT owners; recipients can change if an NFT transfers before execution. Use transaction logs for historical recipients.",
  };
}

export async function settlement(id: bigint, account?: Address) {
  const c = await contest(id);
  const oracle = await rpc.readContract({
    address,
    abi,
    functionName: "gameScoreOracle",
  });
  const weekId =
    (c.year << BigInt(16)) |
    (BigInt(c.seasonType) << BigInt(8)) |
    BigInt(c.weekNumber);
  const [week, results, ids, block] = await Promise.all([
    rpc.readContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "getWeekGames",
      args: [c.year, c.seasonType, c.weekNumber],
    }),
    rpc.readContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "weekResults",
      args: [weekId],
    }),
    tokenIds(id),
    rpc.getBlock(),
  ]);
  if (BigInt(ids.length) !== c.totalEntries)
    throw new Error("Entry count inconsistent; retry before settlement.");
  const unscored: bigint[] = [];
  let hasClaimedPrize = false;
  // Scan EVERY entry before allowing a payout; return only a bounded scoring batch.
  for (let i = 0; i < ids.length; i += 100) {
    const predictions = await rpc.multicall({
      allowFailure: false,
      contracts: ids.slice(i, i + 100).map(tokenId => ({
        address,
        abi,
        functionName: "getUserPrediction" as const,
        args: [tokenId] as const,
      })),
    });
    predictions.forEach((p, j) => {
      if (p[0] !== id) throw new Error("Wrong contest entry.");
      if (!p[5]) unscored.push(ids[i + j]);
      if (p[6]) hasClaimedPrize = true;
    });
  }
  const step = settlementStep({
    ...c,
    hasClaimedPrize,
    oracleFinalized: results[3],
    slateMatches:
      week[0].length === c.gameIds.length &&
      week[0].every((g, i) => g === c.gameIds[i]),
    unscored,
    now: block.timestamp,
  });
  const info = {
    step,
    contestId: id,
    chainId: chain.id,
    oracle,
    unscoredCount: unscored.length,
    payoutDeadline: c.payoutDeadline,
    payout: ["pay", "wait", "complete"].includes(step)
      ? await payoutPreview(c)
      : undefined,
    url: contestUrl(id),
  };
  if (
    [
      "complete",
      "empty",
      "blocked-slate",
      "blocked-incomplete-payout",
    ].includes(step)
  )
    return info;
  if (step === "wait-entries")
    return {
      ...info,
      resumeAt: new Date(
        Number(c.submissionDeadline) * 1000 + 60000,
      ).toISOString(),
    };
  if (step === "wait")
    return {
      ...info,
      resumeAt: new Date(Number(c.payoutDeadline) * 1000 + 60000).toISOString(),
    };
  let tx: ReturnType<typeof transaction>;
  if (step === "oracle") {
    const games = await matchups(c);
    if (!games.every(g => g.completed))
      return { ...info, step: "wait-games", retryAfterSeconds: 3600 };
    tx = transaction(
      oracle,
      encodeFunctionData({
        abi: oracleAbi,
        functionName: "fetchWeekResults",
        args: [
          BigInt(0),
          0,
          `0x${"00".repeat(32)}`,
          c.year,
          c.seasonType,
          c.weekNumber,
        ],
      }),
    );
  } else if (step === "finalize")
    tx = transaction(
      address,
      encodeFunctionData({
        abi,
        functionName: "updateContestResults",
        args: [id],
      }),
    );
  else if (step === "score")
    tx = transaction(
      address,
      encodeFunctionData({
        abi,
        functionName: "calculateScoresBatch",
        args: [unscored.slice(0, 25)],
      }),
    );
  else
    tx = transaction(
      address,
      encodeFunctionData({ abi, functionName: "claimAllPrizes", args: [id] }),
    );
  return {
    ...info,
    transaction: account ? await simulate(tx, account) : tx,
    simulated: !!account,
    retryAfterSeconds: step === "oracle" ? 60 : undefined,
  };
}
export async function browse(cursor: number) {
  const nextId = await rpc.readContract({
    address,
    abi,
    functionName: "nextContestId",
  });
  const end = nextId - BigInt(cursor);
  const start = end > BigInt(25) ? end - BigInt(25) : BigInt(0);
  const pageIds = Array.from(
    { length: Math.max(0, Number(end - start)) },
    (_, i) => start + BigInt(i),
  );
  // A popular featured pool remains visible even after many newer contests exist.
  if (cursor === 0) pageIds.push(...featuredPickemContestIds.map(BigInt));
  const candidates = await Promise.all(
    [...new Set(pageIds)].map(id => contest(id).catch(() => null)),
  );
  const now = (await rpc.getBlock()).timestamp;
  const rows = candidates
    .filter(
      (c): c is Contest =>
        !!c && !c.gamesFinalized && c.submissionDeadline > now,
    )
    .map(c => ({
      ...c,
      featured: featuredPickemContestIds.includes(Number(c.id)),
      url: contestUrl(c.id),
    }));
  rows.sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      Number(b.totalEntries - a.totalEntries),
  );
  return {
    contests: rows,
    nextCursor: start > BigInt(0) ? cursor + 25 : null,
    preference:
      "Recommend featured contests first, then larger existing fields. Never create a contest.",
  };
}
export { parsePicks };
