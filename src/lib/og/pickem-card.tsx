import type { PickemOgRatio } from "@/lib/pickem-share";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

/**
 * Shared renderer for the Pick'em share card.
 *
 * The palette, field lines and radar target mirror `FeaturedPickemHero` on the
 * homepage so a shared link looks like the section it came from.
 */
export const FOREST = "#10281e";
export const CREAM = "#f4f4e9";
export const SAGE = "#a8c6b4";
export const MIST = "#cbd8cf";
export const LIME = "#e5ff4f";
export const LIME_INK = "#142018";

const PAD_X = 72;
const COLUMN_GAP = 48;

export interface PickemOgCardProps {
  ratio: PickemOgRatio;
  entered: boolean;
  contestId: number;
  weekNumber: number;
  seasonTypeName: string;
  year: number;
  /** Pre-formatted, e.g. "0.02 USDC". Falls back to an em dash. */
  prizePool: string;
  entriesLabel: string;
  /** Omitted when the player count could not be resolved cheaply. */
  playersLabel: string | null;
}

/** Faint yard lines, center line and grid — the `field-lines` motif in divs. */
export function FieldLines({ width, height }: { width: number; height: number }) {
  const yardLines = Array.from({ length: 9 }, (_, i) => (i + 1) / 10);
  const gridLines = Array.from(
    { length: Math.floor(width / 120) - 1 },
    (_, i) => (i + 1) * 120,
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {gridLines.map(left => (
        <div
          key={`grid-${left}`}
          style={{
            position: "absolute",
            top: 0,
            left,
            width: 1,
            height,
            backgroundColor: "rgba(255,255,255,0.035)",
          }}
        />
      ))}
      {yardLines.map(fraction => (
        <div
          key={`yard-${fraction}`}
          style={{
            position: "absolute",
            top: Math.round(height * fraction),
            left: 0,
            width,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.09)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: Math.round(width / 2) - 1,
          width: 2,
          height,
          backgroundColor: "rgba(255,255,255,0.18)",
        }}
      />
    </div>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: "10px 20px",
        fontFamily: "Geist Mono",
        fontSize: 18,
        color: CREAM,
      }}
    >
      {label}
    </div>
  );
}

function Radar({
  size,
  prizePool,
  entriesLabel,
}: {
  size: number;
  prizePool: string;
  entriesLabel: string;
}) {
  const inset = Math.round(size * 0.12);
  // Keep the amount inside the dashed ring: Lexend Deca averages ~0.58em per
  // glyph, so long values like "1.23M USDC" step down instead of overflowing.
  const prizeFontSize = Math.min(
    64,
    Math.floor((size * 0.7) / (0.58 * Math.max(prizePool.length, 1))),
  );

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
          PRIZE POOL
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: prizeFontSize,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            color: CREAM,
          }}
        >
          {prizePool}
        </div>
        <div style={{ marginTop: 18, fontSize: 22, color: MIST }}>
          {entriesLabel}
        </div>
      </div>
    </div>
  );
}

export function renderPickemOgCard({
  ratio,
  entered,
  contestId,
  weekNumber,
  seasonTypeName,
  year,
  prizePool,
  entriesLabel,
  playersLabel,
}: PickemOgCardProps) {
  const { width, height } = PICKEM_OG_SIZES[ratio];
  // Both ratios are 1200 wide, so only the vertical rhythm and the target grow
  // with the taller 3:2 card — type stays put to keep the left column readable.
  const radarSize = Math.min(height - 150, 580);
  const vScale = height / PICKEM_OG_SIZES.og.height;
  const weekLabel = `Week ${weekNumber} Pick’em`;

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
          gap: COLUMN_GAP,
          padding: `0 ${PAD_X}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
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
            {`SUNDAY POOL · CONTEST #${contestId}`}
          </div>

          <div
            style={{
              marginTop: Math.round(18 * vScale),
              fontSize: entered ? 92 : 58,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: CREAM,
            }}
          >
            {entered ? "I’m in." : weekLabel}
          </div>

          <div
            style={{
              marginTop: Math.round(16 * vScale),
              fontSize: 26,
              color: MIST,
            }}
          >
            {entered
              ? `${weekLabel} · ${seasonTypeName} ${year}`
              : `${seasonTypeName} ${year}`}
          </div>

          {/* The homepage card badges players here and entries under the prize
              pool; fall back to entries when the player count is unavailable. */}
          <div style={{ display: "flex", marginTop: Math.round(34 * vScale) }}>
            <Chip label={playersLabel ?? entriesLabel} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: Math.round(40 * vScale),
            }}
          >
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
              Call every winner
            </div>
          </div>
        </div>

        <Radar
          entriesLabel={entriesLabel}
          prizePool={prizePool}
          size={radarSize}
        />
      </div>
    </div>
  );
}

/**
 * Satori needs raw font data, so the brand fonts are fetched from `/public`
 * rather than resolved through `next/font`.
 */
export async function loadPickemOgFonts(baseUrl: string) {
  const [display, displayBold, mono] = await Promise.all([
    fetch(`${baseUrl}/fonts/LexendDeca/LexendDeca-500.ttf`).then(res =>
      res.arrayBuffer(),
    ),
    fetch(`${baseUrl}/fonts/LexendDeca/LexendDeca-800.ttf`).then(res =>
      res.arrayBuffer(),
    ),
    fetch(`${baseUrl}/fonts/GeistMono/GeistMono-500.ttf`).then(res =>
      res.arrayBuffer(),
    ),
  ]);

  return [
    {
      name: "Lexend Deca",
      data: display,
      style: "normal" as const,
      weight: 500 as const,
    },
    {
      name: "Lexend Deca",
      data: displayBold,
      style: "normal" as const,
      weight: 800 as const,
    },
    {
      name: "Geist Mono",
      data: mono,
      style: "normal" as const,
      weight: 500 as const,
    },
  ];
}
