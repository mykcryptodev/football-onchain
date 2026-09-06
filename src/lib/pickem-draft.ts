export interface PendingEntry {
  kind: "transaction" | "bundle";
  id: string;
}
export interface PickemDraft {
  version: 1;
  picks: Record<string, number>;
  tiebreakerPoints: string;
  updatedAt: number;
  pending?: PendingEntry;
}
export function draftKey(
  chainId: number,
  contract: string,
  contestId: number,
  address?: string,
) {
  return `pickem-draft:${chainId}:${contract.toLowerCase()}:${contestId}:${address?.toLowerCase() || "guest"}`;
}
export function parseDraft(
  raw: string | null,
  gameIds: string[],
): PickemDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value.version !== 1 ||
      !value.picks ||
      typeof value.tiebreakerPoints !== "string"
    )
      return null;
    return {
      version: 1,
      picks: Object.fromEntries(
        gameIds.map(id => [
          id,
          value.picks[id] === 0 || value.picks[id] === 1 ? value.picks[id] : -1,
        ]),
      ),
      tiebreakerPoints: value.tiebreakerPoints,
      updatedAt: Number(value.updatedAt) || 0,
      ...(value.pending &&
      ["transaction", "bundle"].includes(value.pending.kind) &&
      typeof value.pending.id === "string"
        ? { pending: value.pending }
        : {}),
    };
  } catch {
    return null;
  }
}
export function hasDraftPicks(draft: PickemDraft | null) {
  return Boolean(
    draft &&
    (Object.values(draft.picks).some(p => p === 0 || p === 1) ||
      draft.tiebreakerPoints ||
      draft.pending),
  );
}
