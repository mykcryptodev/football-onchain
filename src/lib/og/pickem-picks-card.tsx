import type { Matchup } from "@/lib/bankr/picks";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import { CREAM, FieldLines, FOREST, MIST, SAGE } from "@/lib/og/pickem-card";
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
  walletAddress?: string;
  walletName?: string;
  walletAvatar?: string;
  logoUrl?: string;
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
const PAD_TOP = 36;
const GAP = 12;
const HEADER_HEIGHT = 48;
const TITLE_MARGIN_TOP = 10;
const TITLE_FONT_SIZE = 56;
/** The title sets `lineHeight: 1`, so its row is exactly the font size tall. */
const TITLE_HEIGHT = TITLE_FONT_SIZE;
const GRID_MARGIN_TOP = 20;

/**
 * X draws the link-card title in a rounded pill anchored to the bottom-left
 * of the image — measured at roughly y 555–609 on a 1200×630 card — so
 * anything rendered down there is covered up in a timeline. The grid stops
 * short of that band instead. It's reserved across the full width because
 * the pill grows with the title, not just at a fixed left-hand size.
 */
const X_OVERLAY_SAFE_HEIGHT = 100;

const CONTENT_WIDTH = PICKEM_OG_SIZES.og.width - PAD_X * 2;
const GRID_HEIGHT =
  PICKEM_OG_SIZES.og.height -
  PAD_TOP -
  HEADER_HEIGHT -
  TITLE_MARGIN_TOP -
  TITLE_HEIGHT -
  GRID_MARGIN_TOP -
  X_OVERLAY_SAFE_HEIGHT;

/** Keeps a two- or three-pick slate from ballooning into the whole grid. */
const MAX_CELL_HEIGHT = 100;

function columnsFor(count: number): number {
  if (count > 12) return 4;
  if (count > 6) return 3;
  return Math.max(1, Math.min(count, 2));
}

/**
 * The team abbreviation is the biggest thing in a cell, and every other size
 * in it is a fixed ratio of that, so one number drives the cell's height. The
 * inverse — height back to type size — is what lets a 16-game slate shrink to
 * fit above the safe band while a 6-game one keeps full-size type. The 3.05
 * multiplier and 12px constant come from measuring a rendered cell: padding,
 * borders, the two smaller lines and the gaps between them all scale with it.
 */
function teamFontSizeFor(cellHeight: number): number {
  return Math.max(18, Math.min(30, Math.floor((cellHeight - 12) / 3.05)));
}

function PickCell({
  entry,
  width,
  height,
  teamFontSize,
}: {
  entry: PickCardEntry;
  width: number;
  height: number;
  teamFontSize: number;
}) {
  const style = RESULT_STYLE[entry.result];
  const padY = Math.round(teamFontSize * 0.4);
  const dotSize = Math.max(6, Math.round(teamFontSize * 0.27));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width,
        height,
        padding: `${padY}px 16px`,
        borderRadius: 14,
        border: `1.5px solid ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "Geist Mono",
            fontSize: Math.round(teamFontSize * 0.44),
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
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize,
            backgroundColor: style.dot,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: teamFontSize,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: CREAM,
          lineHeight: 1,
        }}
      >
        {entry.team}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: Math.round(teamFontSize * 0.47),
          color: MIST,
        }}
      >
        {`vs ${entry.opponent}`}
      </div>
    </div>
  );
}

/**
 * Maps a contest's resolved games and one entry's raw 0/1 picks into the
 * per-game display data this card renders. `games[i]` and `picks[i]` both
 * come from the same `c.gameIds` order (see `src/lib/bankr/service.ts`), so
 * they line up by index with no reordering needed.
 */
export function buildPickCardEntries(
  games: Matchup[],
  picks: readonly number[],
): PickCardEntry[] {
  return games.map((g, i) => {
    const homeWon =
      g.completed &&
      g.homeScore !== undefined &&
      g.awayScore !== undefined &&
      g.homeScore !== g.awayScore
        ? g.homeScore > g.awayScore
        : null;
    const pickedHome = picks[i] === 1;
    const result: PickCardEntry["result"] =
      homeWon === null
        ? "pending"
        : pickedHome === homeWon
          ? "correct"
          : "wrong";
    return {
      number: i + 1,
      team: pickedHome ? g.home : g.away,
      opponent: pickedHome ? g.away : g.home,
      result,
    };
  });
}

export function renderPickemPicksOgCard({
  contestId,
  tokenId,
  walletAddress,
  walletName,
  walletAvatar,
  logoUrl = `${getBaseUrl()}/icon.png`,
  weekNumber,
  seasonTypeName,
  year,
  correctPicks,
  gamesDecided,
  picks,
}: PickemPicksOgCardProps) {
  const { width, height } = PICKEM_OG_SIZES.og;
  const scoreLine =
    gamesDecided > 0
      ? `${correctPicks}/${gamesDecided} correct`
      : "Picks locked in";
  const columns = columnsFor(picks.length);
  const cellWidth = Math.floor((CONTENT_WIDTH - (columns - 1) * GAP) / columns);
  const rows = Math.max(1, Math.ceil(picks.length / columns));
  const cellHeight = Math.min(
    MAX_CELL_HEIGHT,
    Math.floor((GRID_HEIGHT - (rows - 1) * GAP) / rows),
  );
  const teamFontSize = teamFontSizeFor(cellHeight);

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
          padding: `${PAD_TOP}px ${PAD_X}px ${X_OVERLAY_SAFE_HEIGHT}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: HEADER_HEIGHT,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {walletAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                height={48}
                src={walletAvatar}
                style={{ borderRadius: 24, objectFit: "cover" }}
                width={48}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: SAGE,
                  color: FOREST,
                  fontSize: 20,
                }}
              >
                {(walletName || walletAddress?.slice(2) || "BB")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: 24, color: CREAM }}>
              {(
                walletName ||
                (walletAddress
                  ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                  : "My picks")
              ).slice(0, 32)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Use the same BankrBall mark as the app navigation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="BankrBall"
              height={72}
              src={logoUrl}
              style={{ objectFit: "contain" }}
              width={72}
            />
            <div
              style={{ fontFamily: "Geist Mono", fontSize: 15, color: SAGE }}
            >
              {`CONTEST #${contestId} · ENTRY #${tokenId}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            height: TITLE_HEIGHT,
            marginTop: TITLE_MARGIN_TOP,
          }}
        >
          <div
            style={{
              fontSize: TITLE_FONT_SIZE,
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
            marginTop: GRID_MARGIN_TOP,
            height: GRID_HEIGHT,
            alignContent: "center",
          }}
        >
          {picks.map(entry => (
            <PickCell
              key={entry.number}
              entry={entry}
              height={cellHeight}
              teamFontSize={teamFontSize}
              width={cellWidth}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
