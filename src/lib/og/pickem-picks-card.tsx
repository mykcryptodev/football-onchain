import {
  CREAM,
  FieldLines,
  FOREST,
  MIST,
  SAGE,
} from "@/lib/og/pickem-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

/**
 * Share card for a single wallet's Pick'em picks. Same palette, field lines
 * and general layout family as `renderPickemOgCard` on the homepage/contest
 * page, but the point of this one is to actually show the picks — every
 * game, the team called, and (once decided) whether it hit — not just a
 * score summary, so it's worth looking at on its own in a timeline.
 */
export interface PickCardEntry {
  number: number;
  team: string;
  opponent: string;
  result: "correct" | "wrong" | "pending";
}

export interface PickemPicksOgCardProps {
  contestId: number;
  tokenId: string;
  weekNumber: number;
  seasonTypeName: string;
  year: number;
  correctPicks: number;
  gamesDecided: number;
  picks: PickCardEntry[];
}

const RESULT_STYLE: Record<
  PickCardEntry["result"],
  { bg: string; border: string; dot: string }
> = {
  correct: {
    bg: "rgba(74,222,128,0.16)",
    border: "rgba(74,222,128,0.45)",
    dot: "#4ade80",
  },
  wrong: {
    bg: "rgba(248,113,113,0.16)",
    border: "rgba(248,113,113,0.45)",
    dot: "#f87171",
  },
  pending: {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.14)",
    dot: "rgba(255,255,255,0.3)",
  },
};

const PAD_X = 64;
const GAP = 14;
const CONTENT_WIDTH = PICKEM_OG_SIZES.og.width - PAD_X * 2;

function columnsFor(count: number): number {
  if (count > 12) return 4;
  if (count > 6) return 3;
  return Math.max(1, Math.min(count, 2));
}

function PickCell({ entry, width }: { entry: PickCardEntry; width: number }) {
  const style = RESULT_STYLE[entry.result];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        padding: "12px 16px",
        borderRadius: 14,
        border: `1.5px solid ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "Geist Mono",
            fontSize: 13,
            color: SAGE,
            letterSpacing: "0.05em",
          }}
        >
          {entry.number}
        </span>
        <div
          style={{
            display: "flex",
            marginLeft: 8,
            width: 8,
            height: 8,
            borderRadius: 8,
            backgroundColor: style.dot,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: CREAM,
          lineHeight: 1,
        }}
      >
        {entry.team}
      </div>
      <div style={{ marginTop: 4, fontSize: 14, color: MIST }}>
        {`vs ${entry.opponent}`}
      </div>
    </div>
  );
}

export function renderPickemPicksOgCard({
  contestId,
  tokenId,
  weekNumber,
  seasonTypeName,
  year,
  correctPicks,
  gamesDecided,
  picks,
}: PickemPicksOgCardProps) {
  const { width, height } = PICKEM_OG_SIZES.og;
  const scoreLine =
    gamesDecided > 0 ? `${correctPicks}/${gamesDecided} correct` : "Picks locked in";
  const columns = columnsFor(picks.length);
  const cellWidth = Math.floor(
    (CONTENT_WIDTH - (columns - 1) * GAP) / columns,
  );

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: FOREST,
        backgroundImage:
          "radial-gradient(circle at 72% 45%, rgba(229,255,79,0.07) 0%, rgba(16,40,30,0) 55%)",
        color: CREAM,
        fontFamily: "Lexend Deca",
        fontWeight: 500,
      }}
    >
      <FieldLines height={height} width={width} />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: `40px ${PAD_X}px 32px`,
        }}
      >
        <div
          style={{
            fontFamily: "Geist Mono",
            fontSize: 15,
            letterSpacing: "0.2em",
            color: SAGE,
          }}
        >
          {`MY PICKS · CONTEST #${contestId} · ENTRY #${tokenId}`}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginTop: 14,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: CREAM,
            }}
          >
            {scoreLine}
          </div>
          <div style={{ marginLeft: 20, fontSize: 22, color: MIST }}>
            {`Week ${weekNumber} Pick'em · ${seasonTypeName} ${year}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: GAP,
            marginTop: 26,
            flex: 1,
            alignContent: "center",
          }}
        >
          {picks.map(entry => (
            <PickCell key={entry.number} entry={entry} width={cellWidth} />
          ))}
        </div>
      </div>
    </div>
  );
}
