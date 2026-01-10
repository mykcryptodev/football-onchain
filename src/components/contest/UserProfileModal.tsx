"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";
import { useTeamColors } from "@/hooks/useTeamColors";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  getNetRewards,
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
} from "@/lib/payout-utils";
import { client } from "@/providers/Thirdweb";

import { Contest, GameScore, PayoutStrategyType, ScoringPlay } from "./types";

interface UserProfileModalProps {
  address: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest?: Contest | null;
  gameScore?: GameScore | null;
  boxTokenId?: number | null;
}

export function UserProfileModal({
  address,
  open,
  onOpenChange,
  contest,
  gameScore,
  boxTokenId,
}: UserProfileModalProps) {
  const { profile, isLoading: profileLoading } = useUserProfile(address);
  const { isInMiniApp } = useIsInMiniApp();

  // Calculate prize amounts for quarters and scoring plays
  const getPrizeAmounts = () => {
    if (!contest) return null;

    const strategyType = getPayoutStrategyType(contest.payoutStrategy);
    const currencyAddress = contest.boxCost.currency;
    const netRewards = getNetRewards(contest.totalRewards);

    if (strategyType === PayoutStrategyType.QUARTERS_ONLY) {
      const payouts = getQuartersOnlyPayouts(netRewards);
      return {
        q1: payouts.q1.amount,
        q2: payouts.q2.amount,
        q3: payouts.q3.amount,
        q4: payouts.q4.amount,
        scoreChange: 0,
        currencyAddress,
      };
    } else {
      const scoreChangeCount = gameScore?.scoringPlays?.length || 0;
      const payouts = getScoreChangesPayouts(netRewards, scoreChangeCount);
      return {
        q1: payouts.quarters.q1.amount,
        q2: payouts.quarters.q2.amount,
        q3: payouts.quarters.q3.amount,
        q4: payouts.quarters.q4.amount,
        scoreChange: payouts.scoreChanges.perScoreChange,
        currencyAddress,
      };
    }
  };

  const prizeAmounts = getPrizeAmounts();
  const currencyAddress = contest?.boxCost.currency || "";

  // Format prize amounts (hooks must be called at top level)
  const { formattedValue: q1PrizeFormatted, isLoading: q1PrizeLoading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(prizeAmounts?.q1 || 0)),
      currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
    });
  const { formattedValue: q2PrizeFormatted, isLoading: q2PrizeLoading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(prizeAmounts?.q2 || 0)),
      currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
    });
  const { formattedValue: q3PrizeFormatted, isLoading: q3PrizeLoading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(prizeAmounts?.q3 || 0)),
      currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
    });
  const { formattedValue: q4PrizeFormatted, isLoading: q4PrizeLoading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(prizeAmounts?.q4 || 0)),
      currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
    });
  const {
    formattedValue: scoreChangePrizeFormatted,
    isLoading: scoreChangePrizeLoading,
  } = useFormattedCurrency({
    amount: BigInt(Math.floor(prizeAmounts?.scoreChange || 0)),
    currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
  });

  // Helper to get formatted prize for a quarter
  const getQuarterPrize = (quarter: number) => {
    switch (quarter) {
      case 1:
        return q1PrizeLoading ? "..." : q1PrizeFormatted;
      case 2:
        return q2PrizeLoading ? "..." : q2PrizeFormatted;
      case 3:
        return q3PrizeLoading ? "..." : q3PrizeFormatted;
      case 4:
        return q4PrizeLoading ? "..." : q4PrizeFormatted;
      default:
        return "";
    }
  };

  // Calculate which quarters and scoring plays this box won
  const getBoxWins = () => {
    if (
      !contest ||
      !gameScore ||
      !contest.randomValuesSet ||
      boxTokenId === null ||
      boxTokenId === undefined
    ) {
      return { quarters: [], scoringPlays: [] };
    }

    // Calculate box position (0-99) from tokenId
    const boxPosition = boxTokenId % 100;
    const row = Math.floor(boxPosition / 10);
    const col = boxPosition % 10;

    // Get the row and col scores for this box
    const boxRowScore = contest.rows[row];
    const boxColScore = contest.cols[col];

    const wonQuarters: number[] = [];
    const wonScoringPlays: Array<{ index: number; play: ScoringPlay }> = [];

    // Check quarter wins
    if (gameScore.qComplete >= 1) {
      if (
        gameScore.homeQ1LastDigit === boxRowScore &&
        gameScore.awayQ1LastDigit === boxColScore
      ) {
        wonQuarters.push(1);
      }
    }
    if (gameScore.qComplete >= 2) {
      if (
        gameScore.homeQ2LastDigit === boxRowScore &&
        gameScore.awayQ2LastDigit === boxColScore
      ) {
        wonQuarters.push(2);
      }
    }
    if (gameScore.qComplete >= 3) {
      if (
        gameScore.homeQ3LastDigit === boxRowScore &&
        gameScore.awayQ3LastDigit === boxColScore
      ) {
        wonQuarters.push(3);
      }
    }
    if (gameScore.qComplete >= 4) {
      if (
        gameScore.homeFLastDigit === boxRowScore &&
        gameScore.awayFLastDigit === boxColScore
      ) {
        wonQuarters.push(4);
      }
    }

    // Check scoring play wins (only for score-changes strategy)
    if (
      contest &&
      gameScore.scoringPlays &&
      getPayoutStrategyType(contest.payoutStrategy) ===
        PayoutStrategyType.SCORE_CHANGES
    ) {
      gameScore.scoringPlays.forEach((play, index) => {
        const homeLastDigit = play.homeScore % 10;
        const awayLastDigit = play.awayScore % 10;
        if (homeLastDigit === boxRowScore && awayLastDigit === boxColScore) {
          wonScoringPlays.push({ index: index + 1, play });
        }
      });
    }

    return { quarters: wonQuarters, scoringPlays: wonScoringPlays };
  };

  const boxWins = getBoxWins();

  // Calculate total winnings
  const calculateTotalWinnings = () => {
    let total = 0;
    boxWins.quarters.forEach(quarter => {
      const prize = prizeAmounts?.[
        `q${quarter}` as keyof typeof prizeAmounts
      ] as number;
      if (prize) total += prize;
    });
    if (prizeAmounts?.scoreChange) {
      total += prizeAmounts.scoreChange * boxWins.scoringPlays.length;
    }
    return total;
  };

  const totalWinnings = calculateTotalWinnings();
  const {
    formattedValue: totalWinningsFormatted,
    isLoading: totalWinningsLoading,
  } = useFormattedCurrency({
    amount: BigInt(Math.floor(totalWinnings)),
    currencyAddress: prizeAmounts?.currencyAddress || currencyAddress,
  });

  const handleViewProfile = async () => {
    if (isInMiniApp && profile?.fid) {
      try {
        await sdk.actions.viewProfile({ fid: profile.fid });
        onOpenChange(false);
      } catch (error) {
        console.error("Error viewing profile:", error);
      }
      return;
    }

    const farcasterUsername = profile?.farcasterUsername;
    if (farcasterUsername) {
      window.open(
        `https://base.app/profile/${farcasterUsername}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    console.warn("No Farcaster profile data available for this user");
  };

  // Get team colors with dark mode support - must be called before early return
  const formatTeamColor = useTeamColors();

  if (
    !address ||
    !contest ||
    !gameScore ||
    boxTokenId === null ||
    boxTokenId === undefined
  ) {
    return null;
  }

  // Calculate box position
  const boxPosition = boxTokenId % 100;
  const row = Math.floor(boxPosition / 10);
  const col = boxPosition % 10;
  const hasRandomValues = contest.randomValuesSet;
  const boxRowScore = hasRandomValues ? contest.rows[row] : undefined;
  const boxColScore = hasRandomValues ? contest.cols[col] : undefined;

  // Extract team info from scoring plays
  const getTeamInfo = () => {
    if (!gameScore?.scoringPlays || gameScore.scoringPlays.length === 0) {
      return {
        awayAbbreviation: gameScore.awayTeamName || "Away",
        awayLogo: undefined,
        homeAbbreviation: gameScore.homeTeamName || "Home",
        homeLogo: undefined,
      };
    }

    // Find away and home teams from scoring plays
    let awayTeam = null;
    let homeTeam = null;

    // Look through scoring plays to find team info
    for (const play of gameScore.scoringPlays) {
      if (play.team) {
        // Check if this team matches the away team name
        if (!awayTeam && play.team.displayName === gameScore.awayTeamName) {
          awayTeam = play.team;
        }
        // Check if this team matches the home team name
        if (!homeTeam && play.team.displayName === gameScore.homeTeamName) {
          homeTeam = play.team;
        }
        // If we found both, break early
        if (awayTeam && homeTeam) break;
      }
    }

    // Fallback: if we didn't find teams by name, use the first two unique teams
    if (!awayTeam || !homeTeam) {
      const uniqueTeams = new Map<string, ScoringPlay["team"]>();
      for (const play of gameScore.scoringPlays) {
        if (play.team && !uniqueTeams.has(play.team.id)) {
          uniqueTeams.set(play.team.id, play.team);
        }
      }
      const teams = Array.from(uniqueTeams.values());
      if (teams.length >= 2) {
        awayTeam = awayTeam || teams[0];
        homeTeam = homeTeam || teams[1];
      } else if (teams.length === 1) {
        // If only one team found, try to determine which is which based on score
        const firstPlay = gameScore.scoringPlays[0];
        if (
          firstPlay &&
          firstPlay.awayScore !== undefined &&
          firstPlay.homeScore !== undefined
        ) {
          // Can't definitively determine, but use what we have
          awayTeam = awayTeam || teams[0];
          homeTeam = homeTeam || teams[0];
        }
      }
    }

    return {
      awayAbbreviation:
        awayTeam?.abbreviation || gameScore.awayTeamName || "Away",
      awayLogo: awayTeam?.logo,
      homeAbbreviation:
        homeTeam?.abbreviation || gameScore.homeTeamName || "Home",
      homeLogo: homeTeam?.logo,
    };
  };

  const teamInfo = getTeamInfo();
  const hasWins =
    boxWins.quarters.length > 0 || boxWins.scoringPlays.length > 0;

  const awayTeamColor = formatTeamColor(gameScore?.awayTeamColor);
  const homeTeamColor = formatTeamColor(gameScore?.homeTeamColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-6 py-4">
          {/* Box Owner - At Top */}
          <div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              {profileLoading ? (
                <div className="flex-1 text-sm text-muted-foreground">
                  Loading owner...
                </div>
              ) : (
                <>
                  <AccountProvider address={address} client={client}>
                    <AccountAvatar
                      fallbackComponent={
                        <Blobbie
                          address={address}
                          className="size-10 rounded-full"
                        />
                      }
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "100%",
                      }}
                    />
                  </AccountProvider>
                  <div className="flex-1 min-w-0">
                    {profile?.name && (
                      <div className="text-sm font-medium truncate">
                        {profile.name}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {address}
                    </div>
                    {profile?.fid && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Farcaster ID: {profile.fid}
                      </div>
                    )}
                    {(profile?.farcasterUsername ||
                      (isInMiniApp && profile?.fid)) && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleViewProfile}
                        >
                          View Profile
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Box Value - With Team Icons and Abbreviations */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-4 text-4xl font-bold">
              <div className="flex items-center gap-2">
                {teamInfo.awayLogo && (
                  <img
                    alt={teamInfo.awayAbbreviation}
                    className="h-8 w-8"
                    src={teamInfo.awayLogo}
                  />
                )}
                <span
                  style={
                    awayTeamColor
                      ? { color: awayTeamColor, display: "inline-block" }
                      : undefined
                  }
                >
                  {teamInfo.awayAbbreviation}
                </span>
              </div>
              <span className="text-muted-foreground">:</span>
              <span>{hasRandomValues ? boxColScore : ""}</span>
              <span className="text-muted-foreground">,</span>
              <div className="flex items-center gap-2">
                {teamInfo.homeLogo && (
                  <img
                    alt={teamInfo.homeAbbreviation}
                    className="h-8 w-8"
                    src={teamInfo.homeLogo}
                  />
                )}
                <span
                  style={
                    homeTeamColor
                      ? { color: homeTeamColor, display: "inline-block" }
                      : undefined
                  }
                >
                  {teamInfo.homeAbbreviation}
                </span>
              </div>
              <span className="text-muted-foreground">:</span>
              <span>{hasRandomValues ? boxRowScore : ""}</span>
            </div>
            {!hasRandomValues && (
              <div className="mt-3 text-sm text-muted-foreground">
                random values for boxes have not yet been assigned
              </div>
            )}
          </div>

          {/* Winnings Summary */}
          {hasWins && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                    Total Winnings
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {totalWinningsLoading ? "..." : totalWinningsFormatted}
                  </div>
                </div>
                <Badge
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-3 py-1"
                  variant="default"
                >
                  {boxWins.quarters.length + boxWins.scoringPlays.length} Win
                  {boxWins.quarters.length + boxWins.scoringPlays.length !== 1
                    ? "s"
                    : ""}
                </Badge>
              </div>
            </div>
          )}

          {/* Quarter Wins */}
          {boxWins.quarters.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Quarter Wins</h3>
              <div className="grid grid-cols-2 gap-2">
                {boxWins.quarters.map(quarter => (
                  <div
                    key={quarter}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <Badge
                      className="bg-emerald-500 hover:bg-emerald-600"
                      variant="default"
                    >
                      Q{quarter === 4 ? "4 (Final)" : quarter}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {getQuarterPrize(quarter)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scoring Play Wins */}
          {boxWins.scoringPlays.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Scoring Play Wins</h3>
              <div className="space-y-2">
                {boxWins.scoringPlays.map(({ index, play }) => (
                  <div
                    key={index}
                    className="p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="font-medium" variant="outline">
                        Score Change #{index}
                      </Badge>
                      <span className="text-sm font-semibold">
                        {scoreChangePrizeLoading
                          ? "..."
                          : scoreChangePrizeFormatted}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {play.text || play.type?.text || "Scoring play"}
                    </div>
                    <div className="text-xs font-mono">
                      Score: {play.awayScore} - {play.homeScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Wins Message */}
          {!hasWins && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">
                This box has not won any quarters or scoring plays yet.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
