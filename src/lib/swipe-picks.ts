/**
 * Pure helpers for the swipe ("Tinder") pick mode. Side 0 is the away team
 * (shown on the left, picked by swiping left); side 1 is the home team
 * (shown on the right, picked by swiping right).
 */

export type PickSide = 0 | 1;

/** Horizontal drag distance, in px, that commits a pick on release. */
export const SWIPE_DISTANCE = 110;
/** Release speed, in px/ms, that commits a pick even on a short drag. */
export const SWIPE_VELOCITY = 0.6;

/** The pick a released drag commits to, or null to snap the card back. */
export function sideFromSwipe(dx: number, velocity = 0): PickSide | null {
  const fast = Math.abs(velocity) >= SWIPE_VELOCITY && Math.abs(dx) > 30;
  if (dx <= -SWIPE_DISTANCE || (fast && velocity < 0)) return 0;
  if (dx >= SWIPE_DISTANCE || (fast && velocity > 0)) return 1;
  return null;
}

export const isPicked = (pick: number | undefined): pick is PickSide =>
  pick === 0 || pick === 1;

/**
 * The card to show after picking `from`: the next unpicked game after it,
 * wrapping to any earlier unpicked game, or `gameIds.length` when every game
 * is picked (the "done" card).
 */
export function nextUnpickedIndex(
  gameIds: string[],
  picks: Record<string, number | undefined>,
  from: number,
): number {
  for (let step = 1; step <= gameIds.length; step++) {
    const index = (from + step) % gameIds.length;
    if (!isPicked(picks[gameIds[index]])) return index;
  }
  return gameIds.length;
}

export const randomSide = (random = Math.random): PickSide =>
  random() < 0.5 ? 0 : 1;
