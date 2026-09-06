import { usePickemDraft } from "@/hooks/usePickemDraft";
import type { PendingEntry } from "@/lib/pickem-draft";

export function usePickemPicks(contestId: number, gameIds: string[]) {
  const { draft, ready, storageAvailable, save } = usePickemDraft(
    contestId,
    gameIds,
  );
  const picks = draft?.picks ?? {};
  const tiebreakerPoints = draft?.tiebreakerPoints ?? "";
  const update = (changes: Partial<NonNullable<typeof draft>>) =>
    save({
      version: 1,
      picks,
      tiebreakerPoints,
      ...draft,
      ...changes,
      updatedAt: Date.now(),
    });
  const getPickedCount = () =>
    gameIds.filter(id => picks[id] === 0 || picks[id] === 1).length;
  return {
    picks,
    tiebreakerPoints,
    ready,
    storageAvailable,
    pending: draft?.pending,
    setPending: (pending: PendingEntry | undefined) => update({ pending }),
    clearDraft: () => save(null),
    setPick: (id: string, pick: number) =>
      update({ picks: { ...picks, [id]: pick } }),
    setTiebreakerPoints: (points: string) =>
      update({ tiebreakerPoints: points }),
    pickAtRandom: () =>
      update({
        picks: Object.fromEntries(
          gameIds.map(id => [
            id,
            picks[id] === 0 || picks[id] === 1
              ? picks[id]
              : Math.random() < 0.5
                ? 0
                : 1,
          ]),
        ),
      }),
    getPickedCount,
    allPicksMade: gameIds.length > 0 && getPickedCount() === gameIds.length,
  };
}
