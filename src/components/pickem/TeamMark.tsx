import { cn } from "@/lib/utils";

/**
 * One side of a matchup: the team's ESPN mark next to its abbreviation, dimmed
 * when it isn't the pick. Deliberately has no "use client" directive and no
 * hooks, so the server-rendered entry page can use it without pulling a client
 * component tree along with it.
 */
export default function TeamMark({
  name,
  abbreviation,
  logo,
  picked,
}: {
  name: string;
  abbreviation?: string;
  logo?: string;
  picked: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        picked ? "font-semibold" : "opacity-35 grayscale",
      )}
    >
      {logo ? (
        // ESPN team marks are remote SVGs/PNGs without next/image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="size-7 shrink-0" src={logo} />
      ) : null}
      <span className="truncate">{abbreviation || name}</span>
    </div>
  );
}
