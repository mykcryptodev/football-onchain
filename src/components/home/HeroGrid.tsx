import { cn } from "@/lib/utils";

const COLUMNS = 10;
const ROWS = 10;
const CELLS = COLUMNS * ROWS;

// Deterministic so server and client render the same grid — Math.random here
// would produce a hydration mismatch.
function isClaimed(index: number) {
  return (index * 37 + ((index / COLUMNS) | 0) * 11) % 7 < 3;
}

const LIVE_CELL = 44;

/**
 * A decorative miniature of the 10x10 squares board used as hero artwork.
 * Cells fade in on a stagger and the live square keeps a slow pulse, which is
 * the one piece of ambient motion on the page.
 */
export function HeroGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid aspect-square w-full grid-cols-10 gap-[3px] rounded-2xl border bg-card/60 p-3 shadow-md",
        className,
      )}
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const live = i === LIVE_CELL;
        const claimed = isClaimed(i);
        const delay = (i % COLUMNS) * 24 + ((i / COLUMNS) | 0) * 24;
        return (
          <span
            key={i}
            style={{ animationDelay: `${delay}ms` }}
            className={cn(
              "animate-in fade-in zoom-in-95 rounded-[3px] fill-mode-both duration-500",
              live
                ? "bg-brand shadow-[0_0_0_3px_var(--brand-muted)]"
                : claimed
                  ? "bg-brand/25"
                  : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}

