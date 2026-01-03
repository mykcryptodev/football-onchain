import { Card, CardContent } from "@/components/ui/card";

import { Contest } from "./types";

interface ContestStatsProps {
  contest: Contest;
}

export function ContestStats({ contest }: ContestStatsProps) {
  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Box Cost</div>
          <div className="text-2xl font-bold">
            {formatEther(contest.boxCost.amount)} ETH
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Boxes Claimed</div>
          <div className="text-2xl font-bold">{contest.boxesClaimed}/100</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Prize Pool</div>
          <div className="text-2xl font-bold">
            {formatEther(contest.totalRewards)} ETH
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
