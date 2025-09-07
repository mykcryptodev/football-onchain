import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { GameScore } from "./types";

interface GameScoresProps {
  gameScore: GameScore;
}

export function GameScores({ gameScore }: GameScoresProps) {
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
      </CardContent>
    </Card>
  );
}
