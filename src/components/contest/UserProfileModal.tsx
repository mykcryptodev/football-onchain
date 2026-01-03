"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { client } from "@/providers/Thirdweb";
import {
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
} from "@/lib/payout-utils";
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
  const { profile, isLoading } = useUserProfile(address);
  const { isInMiniApp } = useIsInMiniApp();

  // Calculate prize amounts for quarters and scoring plays
  const getPrizeAmounts = () => {
    if (!contest) return null;

    const strategyType = getPayoutStrategyType(contest.payoutStrategy);
    const currencyAddress = contest.boxCost.currency;

    if (strategyType === PayoutStrategyType.QUARTERS_ONLY) {
      const payouts = getQuartersOnlyPayouts(contest.totalRewards);
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
      const payouts = getScoreChangesPayouts(
        contest.totalRewards,
        scoreChangeCount,
      );
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

  const handleViewProfile = async () => {
    if (!profile?.fid) {
      console.warn("No FID available for this user");
      return;
    }

    if (isInMiniApp) {
      try {
        await sdk.actions.viewProfile({ fid: profile.fid });
        onOpenChange(false); // Close modal after opening profile
      } catch (error) {
        console.error("Error viewing profile:", error);
      }
    } else {
      // If not in mini app, could open Farcaster profile in new tab
      // For now, just show the modal
      console.log("Not in mini app, showing modal instead");
    }
  };

  if (!address) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            {isInMiniApp && profile?.fid
              ? "Click the button below to view this user's Farcaster profile"
              : "View user information"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <AccountProvider address={address} client={client}>
                <AccountAvatar
                  fallbackComponent={
                    <Blobbie
                      address={address}
                      className="size-20 rounded-full"
                    />
                  }
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "100%",
                  }}
                />
              </AccountProvider>

              {profile?.name && (
                <div className="text-center">
                  <div className="text-lg font-semibold">{profile.name}</div>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <div className="font-mono break-all">{address}</div>
              </div>

              {profile?.fid && (
                <div className="text-center text-sm text-muted-foreground">
                  <div>Farcaster ID: {profile.fid}</div>
                </div>
              )}

              {isInMiniApp && profile?.fid && (
                <Button className="mt-4" onClick={handleViewProfile}>
                  View Farcaster Profile
                </Button>
              )}
            </div>

            {/* Box Winning Information */}
            {contest &&
              gameScore &&
              boxTokenId !== null &&
              boxTokenId !== undefined && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Box Information</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-1">
                        Box Position
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {gameScore.awayTeamName || "Away"}:{" "}
                        {contest.cols[(boxTokenId % 100) % 10]}
                        {" - "}
                        {gameScore.homeTeamName || "Home"}:{" "}
                        {contest.rows[Math.floor((boxTokenId % 100) / 10)]}
                      </div>
                    </div>

                    {(boxWins.quarters.length > 0 ||
                      boxWins.scoringPlays.length > 0) && (
                      <>
                        {boxWins.quarters.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">
                              Won Quarters
                            </div>
                            <div className="space-y-2">
                              {boxWins.quarters.map(quarter => (
                                <div
                                  key={quarter}
                                  className="flex items-center justify-between p-2 bg-muted rounded border border-border"
                                >
                                  <Badge
                                    variant="default"
                                    className="bg-emerald-500 hover:bg-emerald-600"
                                  >
                                    Q{quarter === 4 ? "4 (Final)" : quarter}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {getQuarterPrize(quarter)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {boxWins.scoringPlays.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">
                              Won Scoring Plays
                            </div>
                            <div className="space-y-2">
                              {boxWins.scoringPlays.map(({ index, play }) => (
                                <div
                                  key={index}
                                  className="text-sm p-2 bg-muted rounded border border-border"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="font-medium">
                                      Score Change #{index}
                                    </div>
                                    <span className="text-sm font-medium">
                                      {scoreChangePrizeLoading
                                        ? "..."
                                        : scoreChangePrizeFormatted}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground text-xs mt-1">
                                    {play.text ||
                                      play.type?.text ||
                                      "Scoring play"}
                                  </div>
                                  <div className="text-xs mt-1">
                                    Score: {play.awayScore} - {play.homeScore}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {boxWins.quarters.length === 0 &&
                      boxWins.scoringPlays.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          This box has not won any quarters or scoring plays.
                        </div>
                      )}
                  </div>
                </div>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
