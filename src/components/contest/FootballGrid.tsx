import { ZERO_ADDRESS } from "thirdweb";
import {
  AccountAvatar,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";

import { Button } from "@/components/ui/button";
import { chain, contests } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useSwapToken } from "@/hooks/useSwapToken";
import { useTeamColors } from "@/hooks/useTeamColors";
import { useTokenInfo } from "@/hooks/useTokenInfo";
import { getPayoutStrategyType } from "@/lib/payout-utils";
import { client } from "@/providers/Thirdweb";

import { SwapModal } from "./SwapModal";
import { BoxOwner, Contest, GameScore, PayoutStrategyType } from "./types";

interface FootballGridProps {
  contest: Contest;
  boxOwners: BoxOwner[];
  gameScore: GameScore | null;
  selectedBoxes: number[];
  onBoxClick: (tokenId: number) => void;
  onClaimedBoxClick?: (address: string, tokenId: number) => void;
  onClaimBoxes?: () => void;
  isClaimingBoxes?: boolean;
}

export function FootballGrid({
  contest,
  boxOwners,
  gameScore,
  selectedBoxes,
  onBoxClick,
  onClaimedBoxClick,
  onClaimBoxes,
  isClaimingBoxes = false,
}: FootballGridProps) {
  const account = useActiveAccount();
  const currentUserAddress = account?.address?.toLowerCase();

  // Fetch token metadata using hook
  const { tokenInfo } = useTokenInfo(contest.boxCost.currency);

  // Swap token hook for both mini app and non-mini app users
  const { swap, isSwapping, swapError, isModalOpen, closeModal, isInMiniApp } =
    useSwapToken(tokenInfo);

  const isRealUser = (address: string) => {
    if (address === ZERO_ADDRESS) return false;
    // Check if it's the contest contract address (not a real user)
    const contestAddress = contests[chain.id];
    return address.toLowerCase() !== contestAddress.toLowerCase();
  };

  const totalCost =
    BigInt(contest.boxCost.amount) * BigInt(selectedBoxes.length);
  const { formattedValue: totalCostFormatted, isLoading: totalCostLoading } =
    useFormattedCurrency({
      amount: totalCost,
      currencyAddress: contest.boxCost.currency,
    });

  const getBoxColor = (
    boxPosition: number,
    actualTokenId: number,
    boxOwner?: string,
  ) => {
    const box = boxOwners.find(b => b.tokenId === actualTokenId);
    if (!box) {
      // Default neutral styling for unclaimed boxes
      return contest?.boxesCanBeClaimed
        ? "bg-background hover:bg-muted/50 cursor-pointer"
        : "bg-background";
    }

    // Selected boxes - keep blue for selection feedback
    if (selectedBoxes.includes(boxPosition)) {
      return "bg-blue-500 text-white";
    }

    // Check if this box belongs to the current user
    const isMyBox =
      currentUserAddress &&
      boxOwner &&
      boxOwner.toLowerCase() === currentUserAddress;

    // If owned by a real user, use neutral colors unless it's the current user's box
    if (box.owner !== ZERO_ADDRESS && isRealUser(box.owner)) {
      if (isMyBox) {
        // Highlight current user's boxes with a subtle accent
        return "bg-muted/30";
      }
      // Neutral for other users' boxes
      return "bg-background";
    }

    // If owned by contest contract or zero address, it's claimable
    if (contest?.boxesCanBeClaimed) {
      return "bg-background hover:bg-muted/50 cursor-pointer";
    }

    return "bg-background";
  };

  const isWinningBox = (row: number, col: number, quarter: number) => {
    if (!gameScore || !contest?.randomValuesSet) return false;

    const homeScore =
      quarter === 1
        ? gameScore.homeQ1LastDigit
        : quarter === 2
          ? gameScore.homeQ2LastDigit
          : quarter === 3
            ? gameScore.homeQ3LastDigit
            : gameScore.homeFLastDigit;

    const awayScore =
      quarter === 1
        ? gameScore.awayQ1LastDigit
        : quarter === 2
          ? gameScore.awayQ2LastDigit
          : quarter === 3
            ? gameScore.awayQ3LastDigit
            : gameScore.awayFLastDigit;

    return contest.rows[row] === homeScore && contest.cols[col] === awayScore;
  };

  const isScoreChangeWinner = (row: number, col: number) => {
    if (!gameScore?.scoringPlays || !contest?.randomValuesSet) return false;

    // Check if this box won any score changes
    return gameScore.scoringPlays.some(play => {
      const homeLastDigit = play.homeScore % 10;
      const awayLastDigit = play.awayScore % 10;
      return (
        contest.rows[row] === homeLastDigit &&
        contest.cols[col] === awayLastDigit
      );
    });
  };

  // Get team colors with dark mode support
  const formatTeamColor = useTeamColors();
  const awayTeamColor = formatTeamColor(gameScore?.awayTeamColor);
  const homeTeamColor = formatTeamColor(gameScore?.homeTeamColor);
  const awayTeamName = gameScore?.awayTeamName || "Away";
  const homeTeamName = gameScore?.homeTeamName || "Home";

  // Helper function to get text color class based on background color (for contrast)
  const getTextColorClass = (bgColor: string | undefined) => {
    if (!bgColor) return "text-foreground";
    try {
      // Convert hex to RGB
      const hex = bgColor.replace("#", "");
      if (hex.length !== 6) return "text-foreground";
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? "text-black" : "text-white";
    } catch {
      return "text-foreground";
    }
  };

  return (
    <>
      {/* Only render SwapModal for non-mini-app users to avoid conflicts */}
      {!isInMiniApp && (
        <SwapModal
          isOpen={isModalOpen}
          tokenInfo={tokenInfo}
          onClose={closeModal}
        />
      )}
      <div className="w-full">
        {/* Team names header */}
        {(awayTeamName || homeTeamName) && (
          <div className="mb-4 text-center text-lg sm:text-xl font-semibold">
            <span
              className={awayTeamColor ? undefined : "text-foreground"}
              style={
                awayTeamColor
                  ? { color: awayTeamColor, display: "inline-block" }
                  : undefined
              }
            >
              {awayTeamName}
            </span>
            <span className="text-muted-foreground mx-2">@</span>
            <span
              className={homeTeamColor ? undefined : "text-foreground"}
              style={
                homeTeamColor
                  ? { color: homeTeamColor, display: "inline-block" }
                  : undefined
              }
            >
              {homeTeamName}
            </span>
          </div>
        )}
        {contest.boxesCanBeClaimed && (
          <p className="text-sm text-muted-foreground mt-1">
            Click on empty squares to select them for purchase
          </p>
        )}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="grid grid-cols-11 gap-0.5 sm:gap-1 w-full rounded-lg p-0.5 sm:p-1">
            {/* Header row with away team scores */}
            <div className="aspect-square bg-muted p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border border-border rounded flex items-center justify-center min-w-[2.5rem] sm:min-w-0" />
            {contest.cols.map((col, i) => (
              <div
                key={i}
                className={`aspect-square p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border border-border rounded flex items-center justify-center min-w-[2.5rem] sm:min-w-0 ${
                  awayTeamColor
                    ? getTextColorClass(awayTeamColor)
                    : "bg-muted text-foreground"
                }`}
                style={
                  awayTeamColor
                    ? {
                        backgroundColor: awayTeamColor,
                      }
                    : {}
                }
              >
                {col}
              </div>
            ))}

            {/* Grid rows */}
            {Array.from({ length: 10 }, (_, row) => (
              <div key={row} className="contents">
                {/* Home team score header */}
                <div
                  className={`aspect-square p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border border-border rounded flex items-center justify-center min-w-[2.5rem] sm:min-w-0 ${
                    homeTeamColor
                      ? getTextColorClass(homeTeamColor)
                      : "bg-muted text-foreground"
                  }`}
                  style={
                    homeTeamColor
                      ? {
                          backgroundColor: homeTeamColor,
                        }
                      : {}
                  }
                >
                  {contest.rows[row]}
                </div>

                {/* Box cells */}
                {Array.from({ length: 10 }, (_, col) => {
                  const boxPosition = row * 10 + col; // Grid position (0-99)
                  const expectedTokenId = contest.id * 100 + boxPosition; // Actual NFT token ID
                  const box = boxOwners.find(
                    b => b.tokenId === expectedTokenId,
                  );

                  // Check for quarter winners
                  const isQuarterWinner =
                    gameScore &&
                    ((gameScore.qComplete >= 1 && isWinningBox(row, col, 1)) ||
                      (gameScore.qComplete >= 2 && isWinningBox(row, col, 2)) ||
                      (gameScore.qComplete >= 3 && isWinningBox(row, col, 3)) ||
                      (gameScore.qComplete >= 4 && isWinningBox(row, col, 4)));

                  // Check for score change winners (only for score-changes strategy)
                  const isScoreChangeWinnerBox =
                    contest &&
                    getPayoutStrategyType(contest.payoutStrategy) ===
                      PayoutStrategyType.SCORE_CHANGES &&
                    isScoreChangeWinner(row, col);

                  const isWinner = isQuarterWinner || isScoreChangeWinnerBox;

                  // Check if box is claimed by a real user
                  const isClaimedByUser =
                    box?.owner &&
                    box.owner !== ZERO_ADDRESS &&
                    isRealUser(box.owner);

                  // Check if this is the current user's box
                  const isMyBox =
                    currentUserAddress &&
                    box?.owner &&
                    box.owner.toLowerCase() === currentUserAddress;

                  // Determine border color - green for winners, default for others
                  const borderColor = isWinner
                    ? "border-emerald-400 dark:border-emerald-500"
                    : "border-border";

                  return (
                    <div
                      key={col}
                      className={`
                       aspect-square p-0.5 sm:p-1 text-[10px] sm:text-xs text-center flex flex-col justify-center items-center transition-colors rounded border ${borderColor} min-w-[2.5rem] sm:min-w-0
                       ${
                         isWinner
                           ? "bg-emerald-100 dark:bg-emerald-900/30"
                           : getBoxColor(
                               boxPosition,
                               expectedTokenId,
                               box?.owner,
                             )
                       }
                       ${isClaimedByUser && !isWinner && !isMyBox ? "cursor-pointer hover:bg-muted/70" : ""}
                       ${isMyBox && !isWinner ? "" : ""}
                     `}
                      onClick={() => {
                        if (isClaimedByUser && onClaimedBoxClick && box) {
                          onClaimedBoxClick(box.owner, expectedTokenId);
                        } else {
                          onBoxClick(boxPosition);
                        }
                      }}
                    >
                      {!isClaimedByUser && (
                        <div className="font-mono text-[10px] sm:text-xs">
                          {boxPosition}
                        </div>
                      )}
                      {isClaimedByUser && (
                        <AccountProvider address={box.owner} client={client}>
                          <AccountAvatar
                            fallbackComponent={
                              <Blobbie
                                address={box.owner}
                                className="size-4 sm:size-6 rounded-full"
                              />
                            }
                            style={{
                              width: "clamp(16px, 4vw, 24px)",
                              height: "clamp(16px, 4vw, 24px)",
                              borderRadius: "100%",
                            }}
                          />
                        </AccountProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {selectedBoxes.length > 0 && contest.boxesCanBeClaimed && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-muted shadow-lg">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedBoxes.length} boxes selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total cost:{" "}
                    {totalCostLoading ? (
                      "..."
                    ) : (
                      <>
                        {totalCostFormatted.split(" ")[0]}{" "}
                        {tokenInfo && (
                          <button
                            className="underline text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSwapping}
                            type="button"
                            onClick={swap}
                          >
                            {tokenInfo.symbol}
                          </button>
                        )}
                        {!tokenInfo && totalCostFormatted.split(" ")[1]}
                      </>
                    )}
                  </p>
                </div>
                <Button disabled={isClaimingBoxes} onClick={onClaimBoxes}>
                  {isClaimingBoxes ? "Claiming..." : "Claim Boxes"}
                </Button>
              </div>

              {/* Swap token button */}
              {tokenInfo && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    className="w-full"
                    disabled={isSwapping}
                    type="button"
                    variant="outline"
                    onClick={swap}
                  >
                    {isSwapping
                      ? "Opening swap..."
                      : `Swap to get ${tokenInfo.symbol}`}
                  </Button>
                  {swapError && (
                    <p className="mt-2 text-xs text-destructive text-center">
                      {swapError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
