import { Badge } from "@/components/ui/badge";
import {
  getPayoutStrategyType,
  getStrategyDescription,
  getStrategyDisplayName,
} from "@/lib/payout-utils";

import { Contest } from "./types";

interface ContestHeaderProps {
  contest: Contest;
}

export function ContestHeader({ contest }: ContestHeaderProps) {
  const strategyType = getPayoutStrategyType(contest.payoutStrategy);
  const strategyName = getStrategyDisplayName(strategyType);
  const strategyDescription = getStrategyDescription(strategyType);

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold">{contest.title}</h1>
          <p className="text-muted-foreground mt-1">Contest #{contest.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={contest.boxesCanBeClaimed ? "default" : "secondary"}>
            {contest.boxesCanBeClaimed ? "Active" : "Closed"}
          </Badge>
          <Badge variant={contest.randomValuesSet ? "default" : "outline"}>
            {contest.randomValuesSet ? "Numbers Set" : "Pending Numbers"}
          </Badge>
          <Badge
            className="bg-blue-50 text-blue-700 border-blue-200"
            variant="outline"
          >
            {strategyName}
          </Badge>
        </div>
      </div>
      {contest.description && (
        <div className="mb-4">
          <p className="text-lg text-muted-foreground">{contest.description}</p>
        </div>
      )}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Payout Strategy:</strong> {strategyDescription}
        </p>
      </div>
    </div>
  );
}
