"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { chain } from "@/constants";
import { useNow } from "@/hooks/useNow";
import { useOwnedPickemEntries } from "@/hooks/useOwnedPickemEntries";
import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemDraft } from "@/hooks/usePickemDraft";
import { hasDraftPicks } from "@/lib/pickem-draft";

export function PickemEntryAction({
  contest,
}: {
  contest: {
    id: number;
    gameIds: string[];
    submissionDeadline: number;
    gamesFinalized?: boolean;
    payoutComplete?: boolean;
    payoutDeadline?: number;
  };
}) {
  const owned = useOwnedPickemEntries();
  const { draft, ready } = usePickemDraft(contest.id, contest.gameIds);
  const now = useNow();
  const entered = owned.data?.some(e => e.contestId === contest.id);
  const { getContestWinners } = usePickemContract();
  const winners = useQuery({
    queryKey: ["pickemWinners", chain.id, contest.id],
    enabled: Boolean(entered && contest.gamesFinalized),
    queryFn: () => getContestWinners(contest.id),
    staleTime: 30_000,
  });
  const claimable =
    contest.gamesFinalized &&
    !contest.payoutComplete &&
    now >= (contest.payoutDeadline ?? Infinity) &&
    owned.data?.some(
      entry =>
        entry.contestId === contest.id &&
        !entry.claimed &&
        winners.data?.some(id => Number(id) === entry.tokenId),
    );
  const open = contest.submissionDeadline > now;
  const label = draft?.pending
    ? "Check entry status"
    : claimable
      ? "Claim winnings"
      : entered
        ? "View my picks"
        : !now || !ready
          ? "View contest"
          : !open
            ? "View results"
            : hasDraftPicks(draft)
              ? "Continue picks"
              : "Make picks";
  return (
    <div className="space-y-2">
      <Button asChild className="w-full">
        <Link href={`/pickem/${contest.id}`}>{label}</Link>
      </Button>
      {open && hasDraftPicks(draft) && !draft?.pending && !entered && (
        <p className="text-xs text-muted-foreground">
          Draft saved ·{" "}
          {Object.values(draft!.picks).filter(p => p === 0 || p === 1).length}{" "}
          of {contest.gameIds.length} picked
        </p>
      )}
    </div>
  );
}
