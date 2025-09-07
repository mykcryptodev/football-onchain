import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Contest } from "./types";

interface ContestActionsProps {
  contest: Contest;
  onRequestRandomNumbers?: () => void;
  onRefreshGameScores?: () => void;
  onViewTransactionHistory?: () => void;
}

export function ContestActions({
  contest,
  onRequestRandomNumbers,
  onRefreshGameScores,
  onViewTransactionHistory,
}: ContestActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!contest.randomValuesSet && (
          <Button
            className="w-full"
            variant="outline"
            onClick={onRequestRandomNumbers}
          >
            Request Random Numbers
          </Button>
        )}
        <Button
          className="w-full"
          variant="outline"
          onClick={onRefreshGameScores}
        >
          Refresh Game Scores
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={onViewTransactionHistory}
        >
          View Transaction History
        </Button>
      </CardContent>
    </Card>
  );
}
