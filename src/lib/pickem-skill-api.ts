/**
 * Shared server-side helpers for the Pick'em read/write API routes that back
 * the Bankr skill (see `public/skills/pickem/SKILL.md`) as well as the
 * "my picks" share page.
 *
 * These endpoints are deliberately the only place that builds contract
 * calldata or does score/prize math for the skill — the model (Bankr) never
 * hand-encodes a `submitPredictions` call or hand-computes a payout amount.
 * It calls these routes, gets back exact numbers and calldata, and relays
 * them to the user / submits them via its own wallet tools.
 */
import {
  encode,
  getContract,
  prepareContractCall,
  readContract,
  ZERO_ADDRESS,
} from "thirdweb";
import { allowance, getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb/utils";
import { erc20Abi, isAddressEqual } from "viem";

import { chain, pickem, pickemNFT } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { abi as pickemNFTAbi } from "@/constants/abis/pickemNFT";
import {
  formatPlace,
  getPickResult,
  type PickResult,
  rankEntries,
  type ScoredGame,
  SEASON_TYPE_LABELS,
} from "@/lib/pickem-scoring";
import { client } from "@/providers/Thirdweb";

export const PICKEM_CHAIN_ID = chain.id;

export function getSeasonTypeName(seasonType: number): string {
  return SEASON_TYPE_LABELS[seasonType] ?? "Season";
}

export function pickemContract() {
  return getContract({
    client,
    chain,
    address: pickem[chain.id],
    abi: pickemAbi,
  });
}

export function pickemNFTContract() {
  return getContract({
    client,
    chain,
    address: pickemNFT[chain.id],
    abi: pickemNFTAbi,
  });
}

export function isNativeCurrency(currency: string): boolean {
  return isAddressEqual(currency as `0x${string}`, ZERO_ADDRESS);
}

/** Formats a raw on-chain amount using the currency's own decimals/symbol. */
export async function formatCurrencyAmount(
  amount: bigint,
  currency: string,
): Promise<{ formatted: string; amountHuman: string; symbol: string }> {
  if (isNativeCurrency(currency)) {
    const amountHuman = toTokens(amount, 18);
    return { formatted: `${amountHuman} ETH`, amountHuman, symbol: "ETH" };
  }

  const contract = getContract({
    client,
    chain,
    address: currency as `0x${string}`,
    abi: erc20Abi,
  });
  const metadata = await getCurrencyMetadata({ contract });
  const amountHuman = toTokens(amount, metadata.decimals);
  return {
    formatted: `${amountHuman} ${metadata.symbol}`,
    amountHuman,
    symbol: metadata.symbol,
  };
}

export interface EncodedTx {
  to: string;
  data: string;
  value: string;
  chainId: number;
  description: string;
}

/** Builds the `{ to, data, value, chainId }` shape Bankr's arbitrary-transaction
 * tool expects for a "Submit this transaction: {json}" prompt. */
export async function buildTx(params: {
  to: string;
  /** A bare method name resolved against `contractAbi` (e.g.
   * "claimAllPrizes"), or a full human-readable signature. */
  method: string;
  contractParams: unknown[];
  contractAbi: typeof pickemAbi;
  value?: bigint;
  description: string;
}): Promise<EncodedTx> {
  const contract = getContract({
    client,
    chain,
    address: params.to,
    abi: params.contractAbi,
  });
  const tx = prepareContractCall({
    contract,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    method: params.method as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: params.contractParams as any,
    value: params.value,
  });
  const data = await encode(tx);
  return {
    to: params.to,
    data,
    value: (params.value ?? 0n).toString(),
    chainId: chain.id,
    description: params.description,
  };
}

export async function buildApproveTx(params: {
  currency: string;
  spender: string;
  amount: bigint;
  description: string;
}): Promise<EncodedTx> {
  // Deliberately no `abi` here (matches usePickemContract's approve call) —
  // an abi-typed contract narrows `method` to its own known signatures and
  // rejects this literal human-readable one.
  const contract = getContract({ client, chain, address: params.currency });
  const tx = prepareContractCall({
    contract,
    method: "function approve(address spender, uint256 amount) returns (bool)",
    params: [params.spender, params.amount],
  });
  const data = await encode(tx);
  return {
    to: params.currency,
    data,
    value: "0",
    chainId: chain.id,
    description: params.description,
  };
}

export async function needsApproval(params: {
  currency: string;
  owner: string;
  spender: string;
  amount: bigint;
}): Promise<boolean> {
  if (params.amount <= 0n) return false;
  const contract = getContract({
    client,
    chain,
    address: params.currency,
    abi: erc20Abi,
  });
  const current = await allowance({
    contract,
    owner: params.owner,
    spender: params.spender,
  });
  return current < params.amount;
}

// ============ ESPN week games ============

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export interface WeekGame extends ScoredGame {
  awayAbbr: string;
  homeAbbr: string;
  awayName: string;
  homeName: string;
  kickoff: string;
  overUnder: number | null;
}

interface EspnCompetitor {
  homeAway: string;
  score?: string;
  team?: {
    abbreviation?: string;
    displayName?: string;
    name?: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  competitions?: Array<{
    date?: string;
    competitors?: EspnCompetitor[];
    status?: { type?: { completed?: boolean; name?: string } };
    odds?: Array<{ overUnder?: number }>;
  }>;
}

export async function fetchWeekGames(
  year: number,
  seasonType: number,
  weekNumber: number,
): Promise<Map<string, WeekGame>> {
  const res = await fetch(
    `${ESPN_SCOREBOARD_URL}?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`,
    { next: { revalidate: 30 } },
  );
  if (!res.ok) {
    throw new Error(`ESPN scoreboard fetch failed with status ${res.status}`);
  }
  const data = (await res.json()) as { events?: EspnEvent[] };

  const map = new Map<string, WeekGame>();
  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition) continue;
    const home = competition.competitors?.find(c => c.homeAway === "home");
    const away = competition.competitors?.find(c => c.homeAway === "away");
    if (!home || !away) continue;

    const homeScore =
      home.score !== undefined ? parseInt(home.score) : undefined;
    const awayScore =
      away.score !== undefined ? parseInt(away.score) : undefined;

    map.set(event.id, {
      gameId: event.id,
      awayAbbr: away.team?.abbreviation ?? "AWAY",
      homeAbbr: home.team?.abbreviation ?? "HOME",
      awayName: away.team?.displayName ?? away.team?.name ?? "Away",
      homeName: home.team?.displayName ?? home.team?.name ?? "Home",
      kickoff: competition.date ?? event.date,
      overUnder: competition.odds?.[0]?.overUnder ?? null,
      homeScore,
      awayScore,
      status: competition.status?.type?.name,
      completed: competition.status?.type?.completed,
    });
  }
  return map;
}

export interface OrderedGame {
  number: number;
  gameId: string;
  awayAbbr: string;
  homeAbbr: string;
  matchup: string;
  kickoff: string;
  overUnder: number | null;
  homeScore?: number;
  awayScore?: number;
  completed?: boolean;
}

/** Chronological (kickoff order) display list — this is the numbering shown
 * to the user in the join/pick template, e.g. "1. CLE @ NE". It is intentionally
 * independent of the contract's on-chain `gameIds` storage order: reads and
 * writes below always key by `gameId`, never by position, so this ordering
 * can never desync predictions. */
export function buildOrderedGames(
  contractGameIds: string[],
  weekGames: Map<string, WeekGame>,
): OrderedGame[] {
  const withData = contractGameIds
    .map(id => weekGames.get(id))
    .filter((g): g is WeekGame => Boolean(g));

  withData.sort(
    (a, b) =>
      new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime() ||
      a.gameId.localeCompare(b.gameId),
  );

  return withData.map((g, i) => ({
    number: i + 1,
    gameId: g.gameId,
    awayAbbr: g.awayAbbr,
    homeAbbr: g.homeAbbr,
    matchup: `${g.awayAbbr} @ ${g.homeAbbr}`,
    kickoff: g.kickoff,
    overUnder: g.overUnder,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    completed: g.completed,
  }));
}

// ============ Contest reads ============

export interface PickemContestOnchain {
  id: number;
  creator: string;
  seasonType: number;
  weekNumber: number;
  year: number;
  gameIds: string[];
  currency: string;
  entryFee: bigint;
  totalPrizePool: bigint;
  totalEntries: number;
  submissionDeadline: number; // unix seconds
  gamesFinalized: boolean;
  payoutComplete: boolean;
  payoutDeadline: number; // unix seconds
  tiebreakerGameId: string;
  payoutType: number;
  payoutPercentages: bigint[];
}

export async function readPickemContest(
  contestId: number,
): Promise<PickemContestOnchain | null> {
  const contract = pickemContract();
  const data = await readContract({
    contract,
    method: "getContest",
    params: [BigInt(contestId)],
  });

  if (!data || Number(data.id) !== contestId || !data.creator) return null;
  if (data.creator === ZERO_ADDRESS) return null;

  return {
    id: Number(data.id),
    creator: data.creator,
    seasonType: data.seasonType,
    weekNumber: data.weekNumber,
    year: Number(data.year),
    gameIds: data.gameIds.map(id => id.toString()),
    currency: data.currency,
    entryFee: data.entryFee,
    totalPrizePool: data.totalPrizePool,
    totalEntries: Number(data.totalEntries),
    submissionDeadline: Number(data.submissionDeadline),
    gamesFinalized: data.gamesFinalized,
    payoutComplete: data.payoutComplete,
    payoutDeadline: Number(data.payoutDeadline),
    tiebreakerGameId: data.tiebreakerGameId.toString(),
    payoutType: data.payoutStructure.payoutType,
    payoutPercentages: [...data.payoutStructure.payoutPercentages],
  };
}

export async function readTreasuryConstants(): Promise<{
  fee: bigint;
  denominator: bigint;
}> {
  const contract = pickemContract();
  const [fee, denominator] = await Promise.all([
    readContract({ contract, method: "TREASURY_FEE", params: [] }),
    readContract({ contract, method: "PERCENT_DENOMINATOR", params: [] }),
  ]);
  return { fee, denominator };
}

// ============ Wallet picks (shared by the picks API route and page) ============

export interface WalletPickemEntry {
  tokenId: number;
  tiebreakerPoints: number | null;
  correctPicks: number;
  gamesDecided: number;
  totalGames: number;
  rank: number | null;
  rankLabel: string | null;
  picks: Array<{
    number: number;
    matchup: string;
    picked: string | null;
    result: PickResult;
  }>;
}

export interface WalletPickemResult {
  contestId: number;
  wallet: string;
  entered: boolean;
  entries: WalletPickemEntry[];
  totalEntriesInContest: number;
  contest: PickemContestOnchain;
}

export async function getWalletPickemEntries(
  contestId: number,
  wallet: string,
): Promise<WalletPickemResult | null> {
  const contest = await readPickemContest(contestId);
  if (!contest) return null;

  const contract = pickemContract();
  const tokenIds = (
    await readContract({
      contract,
      method: "getUserTokensForContest",
      params: [BigInt(contestId), wallet],
    })
  ).map(id => Number(id));

  if (tokenIds.length === 0) {
    return {
      contestId,
      wallet,
      entered: false,
      entries: [],
      totalEntriesInContest: 0,
      contest,
    };
  }

  const weekGames = await fetchWeekGames(
    contest.year,
    contest.seasonType,
    contest.weekNumber,
  );
  const orderedGames = buildOrderedGames(contest.gameIds, weekGames);
  const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

  const allTokenIds = (
    await readContract({
      contract,
      method: "getContestTokenIds",
      params: [BigInt(contestId)],
    })
  ).map(id => Number(id));

  const allEntries = await Promise.all(
    allTokenIds.map(async tokenId => {
      const [picks, prediction] = await Promise.all([
        readContract({
          contract,
          method: "getUserPicks",
          params: [BigInt(tokenId), gameIdsBigInt],
        }),
        readContract({
          contract,
          method: "getUserPrediction",
          params: [BigInt(tokenId)],
        }),
      ]);
      return {
        tokenId,
        picks: picks.map(p => Number(p)),
        tiebreakerPoints: Number(prediction[3]),
      };
    }),
  );

  const games = Array.from(weekGames.values());
  const ranked = rankEntries(
    allEntries,
    contest.gameIds,
    games,
    contest.tiebreakerGameId,
  );
  const rankByToken = new Map(ranked.map(r => [r.tokenId, r]));
  const byToken = new Map(allEntries.map(e => [e.tokenId, e]));

  const entries: WalletPickemEntry[] = tokenIds.map(tokenId => {
    const entry = byToken.get(tokenId);
    const rank = rankByToken.get(tokenId);
    const pickByGameId = new Map(
      contest.gameIds.map((gameId, i) => [gameId, entry?.picks[i] ?? null]),
    );

    const picks = orderedGames.map(game => {
      const side = pickByGameId.get(game.gameId);
      const picked =
        side === 1 ? game.homeAbbr : side === 0 ? game.awayAbbr : null;
      const weekGame = weekGames.get(game.gameId);
      const result =
        weekGame && side !== null && side !== undefined
          ? getPickResult(weekGame, side)
          : ("pending" as const);
      return { number: game.number, matchup: game.matchup, picked, result };
    });

    return {
      tokenId,
      tiebreakerPoints: entry?.tiebreakerPoints ?? null,
      correctPicks: rank?.correctPicks ?? 0,
      gamesDecided: rank?.scoredGames ?? 0,
      totalGames: contest.gameIds.length,
      rank: rank?.rank ?? null,
      rankLabel: rank ? formatPlace(rank.rank) : null,
      picks,
    };
  });

  return {
    contestId,
    wallet,
    entered: true,
    entries,
    totalEntriesInContest: allTokenIds.length,
    contest,
  };
}
