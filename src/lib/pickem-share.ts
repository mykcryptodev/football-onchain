/**
 * Helpers for Pick'em share links and their Open Graph / Farcaster images.
 *
 * A share URL is just the contest page plus `?entered=1`, which flips the
 * metadata and the OG card into the "I'm in" variant. The flag is a boolean —
 * it never carries a wallet address or any other identity.
 */

export const PICKEM_ENTERED_PARAM = "entered";
export const PICKEM_OG_RATIO_PARAM = "ratio";

/**
 * `og` is the 1.91:1 card used by Open Graph and Twitter/X.
 * `miniapp` is the 3:2 card Farcaster mini app embeds require.
 */
export type PickemOgRatio = "og" | "miniapp";

export const PICKEM_OG_SIZES: Record<
  PickemOgRatio,
  { width: number; height: number }
> = {
  og: { width: 1200, height: 630 },
  miniapp: { width: 1200, height: 800 },
};

type SearchParamValue = string | string[] | undefined;

function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/** Truthy for `?entered=1` and `?entered=true`; everything else is false. */
export function isEnteredShare(value: SearchParamValue): boolean {
  const raw = firstValue(value)?.toLowerCase();
  return raw === "1" || raw === "true";
}

/** Defaults to the 3:2 mini app size so existing embed consumers are unchanged. */
export function parsePickemOgRatio(value: SearchParamValue): PickemOgRatio {
  return firstValue(value)?.toLowerCase() === "og" ? "og" : "miniapp";
}

/** Canonical contest URL, with no share state attached. */
export function buildPickemContestUrl(
  baseUrl: string,
  contestId: number | string,
): string {
  return `${trimBaseUrl(baseUrl)}/pickem/${contestId}`;
}

/** The URL a player posts to X or Farcaster after submitting picks. */
export function buildPickemShareUrl(
  baseUrl: string,
  contestId: number | string,
): string {
  return `${buildPickemContestUrl(baseUrl, contestId)}?${PICKEM_ENTERED_PARAM}=1`;
}

export function buildPickemOgImageUrl({
  baseUrl,
  contestId,
  entered = false,
  ratio = "miniapp",
}: {
  baseUrl: string;
  contestId: number | string;
  entered?: boolean;
  ratio?: PickemOgRatio;
}): string {
  const search = new URLSearchParams();
  if (ratio !== "miniapp") search.set(PICKEM_OG_RATIO_PARAM, ratio);
  if (entered) search.set(PICKEM_ENTERED_PARAM, "1");

  const query = search.toString();
  const url = `${trimBaseUrl(baseUrl)}/api/og/pickem/${contestId}`;
  return query ? `${url}?${query}` : url;
}

export function formatEntriesLabel(totalEntries: number): string {
  return `${totalEntries} ${totalEntries === 1 ? "entry" : "entries"}`;
}

export function formatPlayersLabel(totalPlayers: number): string {
  return `${totalPlayers} ${totalPlayers === 1 ? "player" : "players"}`;
}

export function buildPickemShareTitle({
  entered,
  seasonTypeName,
  weekNumber,
  year,
  contestId,
}: {
  entered: boolean;
  seasonTypeName: string;
  weekNumber: number;
  year: number;
  contestId: number;
}): string {
  const week = `${seasonTypeName} Week ${weekNumber} ${year}`;
  return entered
    ? `I'm in — ${week} Pick'em`
    : `${week} - Pick'em Contest #${contestId}`;
}

export function buildPickemShareDescription({
  entered,
  totalEntries,
}: {
  entered: boolean;
  totalEntries: number;
}): string {
  const entries = formatEntriesLabel(totalEntries);
  return entered
    ? `My picks are locked in — ${entries} so far. Think you can beat me? Onchain scoring, instant payouts.`
    : `Join this Pick'em contest! ${entries} so far. Blockchain-powered fair play with instant payouts.`;
}
