import { Badge } from "@/components/ui/badge";

import { Contest } from "./types";

interface ContestHeaderProps {
  contest: Contest;
}

export function ContestHeader({ contest }: ContestHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Contest #{contest.id}</h1>
        <div className="flex gap-2">
          <Badge variant={contest.boxesCanBeClaimed ? "default" : "secondary"}>
            {contest.boxesCanBeClaimed ? "Active" : "Closed"}
          </Badge>
          <Badge variant={contest.randomValuesSet ? "default" : "outline"}>
            {contest.randomValuesSet ? "Numbers Set" : "Pending Numbers"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
