"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Blobbie, useActiveAccount } from "thirdweb/react";
import { shortenAddress } from "thirdweb/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemNFT } from "@/hooks/usePickemNFT";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateEntryPrize } from "@/lib/pickem-prize";
import { rankEntries, type ScoredGame } from "@/lib/pickem-scoring";
import { resolveAvatarUrl } from "@/lib/utils";

const PERCENT_DENOMINATOR = 1000;
const PLACE_LABELS = [
  "1st Place",
  "2nd Place",
  "3rd Place",
  "4th Place",
  "5th Place",
];

interface LeaderboardEntry {
  tokenId: number;
  address: string;
  originalPredictor: string;
  correctPicks: number;
  totalGames: number;
  tiebreakerPoints: number;
  submissionTime: number;
  rank: number;
  prize: bigint;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  prizePool: bigint;
  currency: string;
  payoutPercentages: readonly bigint[];
}

const EMPTY_DATA: LeaderboardData = {
  entries: [],
  prizePool: BigInt(0),
  currency: "",
  payoutPercentages: [],
};

interface PickemLeaderboardProps {
  contestId: number;
  onClose: () => void;
}

async function fetchWeekGames(
  year: number,
  seasonType: number,
  weekNumber: number,
): Promise<ScoredGame[]> {
  const response = await fetch(
    `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch week games");
  }
  return response.json() as Promise<ScoredGame[]>;
}

// Helper component to display formatted prize
function PrizeDisplay({
  prize,
  currency,
}: {
  prize: bigint;
  currency: string;
}) {
  const { formattedValue, isLoading } = useFormattedCurrency({
    amount: prize,
    currencyAddress: currency,
  });

  return (
    <p className="font-semibold text-green-600 dark:text-green-400">
      {isLoading ? "..." : formattedValue}
    </p>
  );
}

/**
 * One entrant's avatar and display name.
 *
 * This used to be thirdweb's `AccountName` + `AccountAvatar`. Those are two
 * independent `useQuery`s with different query keys, so each row resolved the
 * *same* address twice — two `getSocialProfiles` calls plus two mainnet ENS
 * reverse lookups, none of them cached on our side. `useUserProfile` is the
 * same resolution behind `/api/user-profile`, which is Redis-cached, and it's
 * already what `PickemEntryOwner` uses.
 */
function Entrant({
  entry,
  isYou,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
}) {
  const { profile, isLoading } = useUserProfile(entry.address);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const name = profile?.name?.trim();
  const fallbackAvatar = (
    <Blobbie address={entry.address} className="size-8 rounded-full" />
  );
  const transferred =
    entry.address.toLowerCase() !== entry.originalPredictor.toLowerCase();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8 shrink-0">
        {avatarUrl ? (
          <AvatarImage alt={name || entry.address} src={avatarUrl} />
        ) : null}
        <AvatarFallback className="bg-transparent p-0">
          {fallbackAvatar}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {name || (isLoading ? "Loading..." : shortenAddress(entry.address))}
          </span>
          {isYou && (
            <Badge className="text-xs" variant="secondary">
              You
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          NFT #{entry.tokenId}
        </p>
        {transferred && (
          <p className="truncate text-xs text-orange-500 dark:text-orange-400">
            Transferred from {entry.originalPredictor.slice(0, 6)}...
            {entry.originalPredictor.slice(-4)}
          </p>
        )}
      </div>
    </div>
  );
}

function rankBadgeVariant(rank: number): "default" | "secondary" | "outline" {
  if (rank === 1) return "default";
  if (rank <= 3) return "secondary";
  return "outline";
}

export default function PickemLeaderboard({
  contestId,
  onClose,
}: PickemLeaderboardProps) {
  const account = useActiveAccount();
  const {
    getContest,
    getContestTokenIds,
    getContestWinners,
    getUserPicks,
    getPayoutRules,
    getNFTPrediction,
  } = usePickemContract();
  const { getNFTOwner } = usePickemNFT();

  const fetchLeaderboard = async (): Promise<LeaderboardData> => {
    // None of these four depend on each other. Awaiting the contest first and
    // the payout rules last cost two extra network round trips before any row
    // could render; thirdweb coalesces same-tick reads into one batched
    // request, so asking for all of them together is a single trip.
    const [contest, tokenIds, winners, payoutRules] = await Promise.all([
      getContest(contestId),
      // Every entry in the contest, not just the on-chain top-N leaderboard
      // cache (which stays empty until scores are calculated via
      // calculateScoresBatch/calculateScore).
      getContestTokenIds(contestId),
      getContestWinners(contestId),
      getPayoutRules(),
    ]);

    const meta = {
      prizePool: contest.totalPrizePool,
      currency: contest.currency,
      payoutPercentages: contest.payoutStructure.payoutPercentages ?? [],
    };

    if (tokenIds.length === 0) return { ...meta, entries: [] };

    const gameIds = contest.gameIds.map(id => id.toString());
    const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

    // The week's scores and the per-entry reads both only need the contest,
    // so they overlap rather than queue behind one another.
    const [games, rawEntries] = await Promise.all([
      fetchWeekGames(
        Number(contest.year),
        Number(contest.seasonType),
        Number(contest.weekNumber),
      ),
      Promise.all(
        tokenIds.map(async tokenId => {
          const [owner, prediction, picks] = await Promise.all([
            getNFTOwner(tokenId),
            getNFTPrediction(tokenId),
            getUserPicks(tokenId, gameIdsBigInt),
          ]);

          return {
            tokenId,
            address: owner,
            originalPredictor: prediction[1] as string, // predictor is second element
            submissionTime: Number(prediction[2]) * 1000,
            tiebreakerPoints: Number(prediction[3]),
            picks: picks.map(pick => Number(pick)),
          };
        }),
      ),
    ]);

    // Rank entries client-side from live/final game results, since the
    // on-chain leaderboard/winners are only populated after scoring runs.
    const ranked = rankEntries(
      rawEntries.map(entry => ({
        tokenId: entry.tokenId,
        picks: entry.picks,
        tiebreakerPoints: entry.tiebreakerPoints,
      })),
      gameIds,
      games,
      contest.tiebreakerGameId.toString(),
    );
    const rankByToken = new Map(ranked.map(entry => [entry.tokenId, entry]));

    const entries: LeaderboardEntry[] = rawEntries
      .map(entry => {
        const rankedEntry = rankByToken.get(entry.tokenId);
        const winnerIndex = winners.findIndex(
          id => Number(id) === entry.tokenId,
        );
        const prize = calculateEntryPrize(
          contest.totalPrizePool,
          payoutRules.fee,
          payoutRules.denominator,
          contest.payoutStructure.payoutPercentages,
          winnerIndex,
        );

        return {
          tokenId: entry.tokenId,
          address: entry.address,
          originalPredictor: entry.originalPredictor,
          correctPicks: rankedEntry?.correctPicks ?? 0,
          totalGames: gameIds.length,
          tiebreakerPoints: entry.tiebreakerPoints,
          submissionTime: entry.submissionTime,
          rank: rankedEntry?.rank ?? 0,
          prize,
        };
      })
      .sort((a, b) => a.rank - b.rank);

    return { ...meta, entries };
  };

  // Held by react-query rather than component state, so reopening the dialog
  // within the client's stale window paints from cache instead of redoing
  // every read.
  const { data, isPending } = useQuery({
    queryKey: ["pickem-leaderboard", contestId],
    queryFn: fetchLeaderboard,
  });
  const { entries, prizePool, currency, payoutPercentages } =
    data ?? EMPTY_DATA;
  const loading = isPending;

  const isYou = (address: string) =>
    Boolean(account?.address) &&
    address.toLowerCase() === account!.address.toLowerCase();

  const { formattedValue: prizePoolFormatted, isLoading: prizePoolLoading } =
    useFormattedCurrency({
      amount: prizePool,
      currencyAddress: currency,
    });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Contest #{contestId} Leaderboard
          </DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Prize Pool Info */}
          <Card className="p-4 bg-accent/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Prize Pool
                </p>
                <p className="text-2xl font-black tracking-[-0.04em]">
                  {prizePoolLoading || !currency ? "..." : prizePoolFormatted}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-black tracking-[-0.04em]">
                  {entries.length}
                </p>
              </div>
            </div>
          </Card>

          {/* Leaderboard */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Entrant</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Tiebreaker</TableHead>
                  <TableHead className="text-right">Prize</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground py-8"
                      colSpan={5}
                    >
                      No entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow
                      key={entry.tokenId}
                      className={isYou(entry.address) ? "bg-accent/50" : ""}
                    >
                      <TableCell>
                        <Badge variant={rankBadgeVariant(entry.rank)}>
                          #{entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Entrant entry={entry} isYou={isYou(entry.address)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold tabular-nums">
                          {entry.correctPicks}/{entry.totalGames}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(
                            (entry.correctPicks / entry.totalGames) *
                            100
                          ).toFixed(0)}
                          %
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.tiebreakerPoints} pts
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.prize > 0 && currency ? (
                          <PrizeDisplay
                            currency={currency}
                            prize={entry.prize}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Payout Structure */}
          <Card className="p-4 bg-accent/30">
            <p className="text-sm font-medium mb-2">Payout Structure</p>
            <div className="space-y-1 text-sm">
              {payoutPercentages.map((percentage, index) => (
                <div key={index} className="flex justify-between">
                  <span>{PLACE_LABELS[index] ?? `${index + 1}th Place`}</span>
                  <span className="font-medium">
                    {(Number(percentage) / PERCENT_DENOMINATOR) * 100}% of pool
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
