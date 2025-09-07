import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { BoxOwner, Contest, GameScore } from "./types";

interface FootballGridProps {
  contest: Contest;
  boxOwners: BoxOwner[];
  gameScore: GameScore | null;
  selectedBoxes: number[];
  onBoxClick: (tokenId: number) => void;
  onClaimBoxes?: () => void;
}

export function FootballGrid({
  contest,
  boxOwners,
  gameScore,
  selectedBoxes,
  onBoxClick,
  onClaimBoxes,
}: FootballGridProps) {
  const formatAddress = (address: string) => {
    if (address === "0x0000000000000000000000000000000000000000") return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

  const getBoxColor = (tokenId: number) => {
    const box = boxOwners.find(b => b.tokenId === tokenId);
    if (!box) return "bg-gray-100";

    if (selectedBoxes.includes(tokenId)) return "bg-blue-500 text-white";
    if (box.owner !== "0x0000000000000000000000000000000000000000")
      return "bg-green-200";
    if (contest?.boxesCanBeClaimed)
      return "bg-gray-50 hover:bg-blue-100 cursor-pointer";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Football Squares Grid</CardTitle>
        <CardDescription>
          Click on empty squares to select them for purchase
        </CardDescription>
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
                const tokenId = row * 10 + col;
                const box = boxOwners.find(b => b.tokenId === tokenId);
                const isWinner =
                  gameScore &&
                  ((gameScore.qComplete >= 1 && isWinningBox(row, col, 1)) ||
                    (gameScore.qComplete >= 2 && isWinningBox(row, col, 2)) ||
                    (gameScore.qComplete >= 3 && isWinningBox(row, col, 3)) ||
                    (gameScore.qComplete >= 4 && isWinningBox(row, col, 4)));

                return (
                  <div
                    key={col}
                    className={`
                      aspect-square border border-gray-300 p-1 text-xs text-center flex flex-col justify-center
                      ${getBoxColor(tokenId)}
                      ${isWinner ? "ring-2 ring-yellow-400 bg-yellow-200" : ""}
                    `}
                    onClick={() => onBoxClick(tokenId)}
                  >
                    <div className="font-mono text-xs">{tokenId}</div>
                    {box?.owner &&
                      box.owner !==
                        "0x0000000000000000000000000000000000000000" && (
                        <div className="text-xs truncate">
                          {formatAddress(box.owner)}
                        </div>
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
              <Button onClick={onClaimBoxes}>Claim Boxes</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
