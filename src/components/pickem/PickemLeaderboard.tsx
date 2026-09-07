"use client";

import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AccountAddress,
  AccountAvatar,
  AccountName,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";
import { shortenAddress } from "thirdweb/utils";

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
import { calculateEntryPrize } from "@/lib/pickem-prize";
import { rankEntries, type ScoredGame } from "@/lib/pickem-scoring";
import { client } from "@/providers/Thirdweb";

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
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizePool, setPrizePool] = useState<bigint>(BigInt(0));
  const [currency, setCurrency] = useState<string>("");
  const [payoutPercentages, setPayoutPercentages] = useState<
    readonly bigint[]
  >([]);

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch contest data
      const contest = await getContest(contestId);
      setPrizePool(contest.totalPrizePool);
      setCurrency(contest.currency);
      setPayoutPercentages(contest.payoutStructure.payoutPercentages ?? []);

      const gameIds = contest.gameIds.map(id => id.toString());
      const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

      // Fetch every entry in the contest, not just the on-chain top-N
      // leaderboard cache (which stays empty until scores are calculated
      // via calculateScoresBatch/calculateScore).
      const [tokenIds, winners, games] = await Promise.all([
        getContestTokenIds(contestId),
        getContestWinners(contestId),
        fetchWeekGames(
          Number(contest.year),
          Number(contest.seasonType),
          Number(contest.weekNumber),
        ),
      ]);

      if (tokenIds.length === 0) {
        setEntries([]);
        return;
      }

      const payoutRules = await getPayoutRules();

      const rawEntries = await Promise.all(
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
      );

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

      const processedEntries: LeaderboardEntry[] = rawEntries
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

      setEntries(processedEntries);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

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
                        <AccountProvider address={entry.address} client={client}>
                          <div className="flex min-w-0 items-center gap-2">
                            <AccountAvatar
                              className="shrink-0"
                              fallbackComponent={
                                <Blobbie
                                  address={entry.address}
                                  className="size-8 rounded-full"
                                />
                              }
                              loadingComponent={
                                <div className="size-8 rounded-full bg-muted animate-pulse" />
                              }
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "100%",
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <AccountName
                                  className="truncate text-sm font-medium"
                                  fallbackComponent={
                                    <AccountAddress
                                      formatFn={addr => shortenAddress(addr)}
                                    />
                                  }
                                  loadingComponent={
                                    <span className="text-sm text-muted-foreground">
                                      Loading...
                                    </span>
                                  }
                                />
                                {isYou(entry.address) && (
                                  <Badge className="text-xs" variant="secondary">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                NFT #{entry.tokenId}
                              </p>
                              {entry.address.toLowerCase() !==
                                entry.originalPredictor.toLowerCase() && (
                                <p className="truncate text-xs text-orange-500 dark:text-orange-400">
                                  Transferred from{" "}
                                  {entry.originalPredictor.slice(0, 6)}...
                                  {entry.originalPredictor.slice(-4)}
                                </p>
                              )}
                            </div>
                          </div>
                        </AccountProvider>
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
                    {(Number(percentage) / PERCENT_DENOMINATOR) * 100}% of
                    pool
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
