import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { getPayoutStrategyType } from "@/lib/payout-utils";
import { Contest, GameScore, PayoutStrategyType } from "./types";

interface GameScoresProps {
  gameScore: GameScore;
  contest?: Contest;
}

export function GameScores({ gameScore, contest }: GameScoresProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Function to calculate the winning box for a scoring play
  const getWinningBoxForPlay = (play: any) => {
    if (!contest?.randomValuesSet) return null;

    // Calculate the last digits of the scores after this play
    const homeLastDigit = play.homeScore % 10;
    const awayLastDigit = play.awayScore % 10;

    // Find the row and column indices that match these digits
    const rowIndex = contest.rows.findIndex(row => row === homeLastDigit);
    const colIndex = contest.cols.findIndex(col => col === awayLastDigit);

    if (rowIndex === -1 || colIndex === -1) return null;

    const tokenId = rowIndex * 10 + colIndex;
    return {
      tokenId,
      row: rowIndex,
      col: colIndex,
      homeDigit: homeLastDigit,
      awayDigit: awayLastDigit,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-red-600">Home Team</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Q1:</span>
                <span
                  className={
                    gameScore.qComplete >= 1
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 1 ? gameScore.homeQ1LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Q2:</span>
                <span
                  className={
                    gameScore.qComplete >= 2
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 2 ? gameScore.homeQ2LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Q3:</span>
                <span
                  className={
                    gameScore.qComplete >= 3
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 3 ? gameScore.homeQ3LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Final:</span>
                <span
                  className={
                    gameScore.qComplete >= 4
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 4 ? gameScore.homeFLastDigit : "?"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-blue-600">Away Team</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Q1:</span>
                <span
                  className={
                    gameScore.qComplete >= 1
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 1 ? gameScore.awayQ1LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Q2:</span>
                <span
                  className={
                    gameScore.qComplete >= 2
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 2 ? gameScore.awayQ2LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Q3:</span>
                <span
                  className={
                    gameScore.qComplete >= 3
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 3 ? gameScore.awayQ3LastDigit : "?"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Final:</span>
                <span
                  className={
                    gameScore.qComplete >= 4
                      ? "font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {gameScore.qComplete >= 4 ? gameScore.awayFLastDigit : "?"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Plays Section */}
        {gameScore.scoringPlays && gameScore.scoringPlays.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80">
              <span>Scoring Plays ({gameScore.scoringPlays.length})</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="space-y-2">
                {gameScore.scoringPlays.map((play, index) => {
                  const winningBox = getWinningBoxForPlay(play);
                  const isScoreChangesStrategy =
                    contest &&
                    getPayoutStrategyType(contest.payoutStrategy) ===
                      PayoutStrategyType.SCORE_CHANGES;

                  return (
                    <div
                      key={play.id}
                      className="rounded-md border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img
                            src={play.team.logo}
                            alt={play.team.displayName}
                            className="h-6 w-6"
                          />
                          <span className="font-medium">
                            {play.team.abbreviation}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Q{play.period.number} - {play.clock.displayValue}
                          </div>
                          <div className="font-semibold">
                            {play.homeScore} - {play.awayScore}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {play.text}
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {play.scoringType.abbreviation}
                        </span>
                        {isScoreChangesStrategy && winningBox && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Box #{winningBox.tokenId} ({winningBox.homeDigit}-
                            {winningBox.awayDigit})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
