import { createThirdwebClient, ZERO_ADDRESS } from "thirdweb";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { chain, contests } from "@/constants";
import { getPayoutStrategyType } from "@/lib/payout-utils";

import { BoxOwner, Contest, GameScore, PayoutStrategyType } from "./types";

// Create Thirdweb client for AccountProvider
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

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
  const isRealUser = (address: string) => {
    if (address === ZERO_ADDRESS) return false;
    // Check if it's the contest contract address (not a real user)
    const contestAddress = contests[chain.id];
    return address.toLowerCase() !== contestAddress.toLowerCase();
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

  const getBoxColor = (boxPosition: number, actualTokenId: number) => {
    const box = boxOwners.find(b => b.tokenId === actualTokenId);
    if (!box) return "bg-gray-100";

    if (selectedBoxes.includes(boxPosition)) return "bg-blue-500 text-white";

    // If owned by a real user (not contest contract), show as claimed
    if (box.owner !== ZERO_ADDRESS && isRealUser(box.owner)) {
      return "bg-green-200";
    }

    // If owned by contest contract or zero address, it's claimable
    if (contest?.boxesCanBeClaimed) {
      return "bg-gray-50 hover:bg-blue-100 cursor-pointer";
    }

    return "bg-gray-100";
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
    <Card>
      <CardHeader>
        <CardTitle>Football Squares Grid</CardTitle>
        {contest.boxesCanBeClaimed && (
          <CardDescription>
            Click on empty squares to select them for purchase
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-11 gap-1 max-w-2xl">
          {/* Header row with away team scores */}
          <div className="bg-blue-100 p-2 text-center font-semibold text-sm" />
          {contest.cols.map((col, i) => (
            <div
              key={i}
              className="bg-blue-100 p-2 text-center font-semibold text-sm"
            >
              {col}
            </div>
          ))}

          {/* Grid rows */}
          {Array.from({ length: 10 }, (_, row) => (
            <div key={row} className="contents">
              {/* Home team score header */}
              <div className="bg-red-100 p-2 text-center font-semibold text-sm">
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
                const isClaimedByUser = box?.owner && 
                  box.owner !== ZERO_ADDRESS && 
                  isRealUser(box.owner);

                return (
                  <div
                    key={col}
                    className={`
                      aspect-square border border-gray-300 p-1 text-xs text-center flex flex-col justify-center items-center
                      ${getBoxColor(boxPosition, expectedTokenId)}
                      ${isWinner ? "ring-2 ring-yellow-400 bg-yellow-200" : ""}
                      ${isClaimedByUser ? "cursor-pointer hover:bg-green-300" : ""}
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
                      <div className="font-mono text-xs">{boxPosition}</div>
                    )}
                    {isClaimedByUser && (
                      <AccountProvider address={box.owner} client={client}>
                        <AccountAvatar
                          fallbackComponent={
                            <Blobbie
                              address={box.owner}
                              className="size-6 rounded-full"
                            />
                          }
                          style={{
                            width: "24px",
                            height: "24px",
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

        {selectedBoxes.length > 0 && contest.boxesCanBeClaimed && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {selectedBoxes.length} boxes selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Total cost:{" "}
                  {formatEther(contest.boxCost.amount * selectedBoxes.length)}{" "}
                  ETH
                </p>
              </div>
              <Button disabled={isClaimingBoxes} onClick={onClaimBoxes}>
                {isClaimingBoxes ? "Claiming..." : "Claim Boxes"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
