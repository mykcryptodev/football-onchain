import {
  Chip,
  CREAM,
  FieldLines,
  FOREST,
  LIME,
  LIME_INK,
  MIST,
  SAGE,
} from "@/lib/og/pickem-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

/**
 * Share card for a single wallet's Pick'em picks. Same palette, field lines
 * and general layout as `renderPickemOgCard` on the homepage/contest page,
 * so a picks link previews as part of the same visual family.
 */
export interface PickemPicksOgCardProps {
  contestId: number;
  tokenId: string;
  weekNumber: number;
  seasonTypeName: string;
  year: number;
  correctPicks: number;
  gamesDecided: number;
  totalGames: number;
  rank: number | null;
  totalEntries: number;
}

function RankRing({
  tokenId,
  size,
  rank,
  totalEntries,
}: {
  tokenId: string;
  size: number;
  rank: number | null;
  totalEntries: number;
}) {
  const inset = Math.round(size * 0.12);
  const rankLabel = rank ? `#${rank}` : `#${tokenId}`;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        border: "2px solid rgba(255,255,255,0.25)",
        backgroundColor: "rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: Math.round(size / 2) - 1,
          left: 0,
          width: size,
          height: 2,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: Math.round(size / 2) - 1,
          width: 2,
          height: size,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          width: size - inset * 2,
          height: size - inset * 2,
          borderRadius: size,
          border: "2px dashed rgba(255,255,255,0.25)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 40px",
        }}
      >
        <div
          style={{
            fontFamily: "Geist Mono",
            fontSize: 15,
            letterSpacing: "0.22em",
            color: SAGE,
          }}
        >
          {rank ? "CURRENT RANK" : "ENTRY"}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: tokenId.length > 6 ? 46 : 76,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            color: CREAM,
          }}
        >
          {rankLabel}
        </div>
        {rank ? (
          <div style={{ marginTop: 18, fontSize: 22, color: MIST }}>
            {`of ${totalEntries} ${totalEntries === 1 ? "entry" : "entries"}`}
          </div>
        ) : null}
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
  totalGames,
  rank,
  totalEntries,
}: PickemPicksOgCardProps) {
  const { width, height } = PICKEM_OG_SIZES.og;
  const radarSize = Math.min(height - 150, 580);

  const scoreLine =
    gamesDecided > 0
      ? `${correctPicks}/${gamesDecided} correct`
      : "Picks locked in";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
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
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
          padding: "0 72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              fontFamily: "Geist Mono",
              fontSize: 15,
              letterSpacing: "0.2em",
              color: SAGE,
            }}
          >
            {`MY PICKS · CONTEST #${contestId}`}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 68,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: CREAM,
            }}
          >
            {scoreLine}
          </div>

          <div style={{ marginTop: 16, fontSize: 26, color: MIST }}>
            {`Week ${weekNumber} Pick'em · ${seasonTypeName} ${year}`}
          </div>

          <div style={{ display: "flex", marginTop: 34 }}>
            <Chip label={`${totalGames} games`} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                borderRadius: 999,
                backgroundColor: LIME,
                color: LIME_INK,
                padding: "10px 22px",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              PICK’EM
            </div>
            <div style={{ marginLeft: 16, fontSize: 20, color: SAGE }}>
              Beat my picks
            </div>
          </div>
        </div>

        <RankRing
          rank={rank}
          size={radarSize}
          tokenId={tokenId}
          totalEntries={totalEntries}
        />
      </div>
    </div>
  );
}
