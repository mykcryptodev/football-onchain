import { Badge } from "@/components/ui/badge";

import { Contest } from "./types";

interface ContestHeaderProps {
  contest: Contest;
}

export function ContestHeader({ contest }: ContestHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">{contest.title}</h1>
          <p className="text-muted-foreground mt-1">Contest #{contest.id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={contest.boxesCanBeClaimed ? "default" : "secondary"}>
            {contest.boxesCanBeClaimed ? "Active" : "Closed"}
          </Badge>
          <Badge variant={contest.randomValuesSet ? "default" : "outline"}>
            {contest.randomValuesSet ? "Numbers Set" : "Pending Numbers"}
          </Badge>
        </div>
      </div>
      {contest.description && (
        <div className="mb-4">
          <p className="text-lg text-muted-foreground">{contest.description}</p>
        </div>
      )}
    </div>
  );
}
