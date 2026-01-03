import { ZERO_ADDRESS } from "thirdweb";
import {
  AccountAvatar,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";

import { Button } from "@/components/ui/button";
import { chain, contests } from "@/constants";
import { getPayoutStrategyType } from "@/lib/payout-utils";
import { client } from "@/providers/Thirdweb";

import { BoxOwner, Contest, GameScore, PayoutStrategyType } from "./types";

interface FootballGridProps {
  contest: Contest;
  boxOwners: BoxOwner[];
  gameScore: GameScore | null;
  selectedBoxes: number[];
  onBoxClick: (tokenId: number) => void;
  onClaimedBoxClick?: (address: string) => void;
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

  const isRealUser = (address: string) => {
    if (address === ZERO_ADDRESS) return false;
    // Check if it's the contest contract address (not a real user)
    const contestAddress = contests[chain.id];
    return address.toLowerCase() !== contestAddress.toLowerCase();
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

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

  return (
    <div className="w-full">
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
              className="aspect-square bg-muted p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border border-border rounded flex items-center justify-center min-w-[2.5rem] sm:min-w-0"
            >
              {col}
            </div>
          ))}

          {/* Grid rows */}
          {Array.from({ length: 10 }, (_, row) => (
            <div key={row} className="contents">
              {/* Home team score header */}
              <div className="aspect-square bg-muted p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border border-border rounded flex items-center justify-center min-w-[2.5rem] sm:min-w-0">
                {contest.rows[row]}
              </div>

              {/* Box cells */}
              {Array.from({ length: 10 }, (_, col) => {
                const boxPosition = row * 10 + col; // Grid position (0-99)
                const expectedTokenId = contest.id * 100 + boxPosition; // Actual NFT token ID
                const box = boxOwners.find(b => b.tokenId === expectedTokenId);

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
                      if (isClaimedByUser && onClaimedBoxClick) {
                        onClaimedBoxClick(box.owner);
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
        <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {selectedBoxes.length} boxes selected
              </p>
              <p className="text-sm text-muted-foreground">
                Total cost:{" "}
                {formatEther(contest.boxCost.amount * selectedBoxes.length)} ETH
              </p>
            </div>
            <Button disabled={isClaimingBoxes} onClick={onClaimBoxes}>
              {isClaimingBoxes ? "Claiming..." : "Claim Boxes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
