"use client";

import { Dices, PartyPopper, Undo2, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHaptics } from "@/hooks/useHaptics";
import { formatKickoffTime } from "@/lib/date";
import {
  isPicked,
  nextUnpickedIndex,
  type PickSide,
  randomSide,
  sideFromSwipe,
} from "@/lib/swipe-picks";
import { cn } from "@/lib/utils";

export interface SwipeGame {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeRecord: string;
  awayRecord: string;
  homeLogo?: string;
  awayLogo?: string;
  homeColor?: string;
  awayColor?: string;
  kickoff: string;
  odds?: { details?: string };
}

interface Celebration {
  key: number;
  label: string;
  logo?: string;
  color: string;
  random: boolean;
  bulk?: number;
}

const FALLBACK_COLOR = "#334155";
const FLY_MS = 260;
const CELEBRATE_MS = 950;
const ROLL_MS = 650;

const teamColor = (hex?: string) =>
  hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : FALLBACK_COLOR;

function sideInfo(game: SwipeGame, side: PickSide) {
  return side === 0
    ? {
        name: game.awayTeam,
        label: game.awayAbbreviation || game.awayTeam,
        logo: game.awayLogo,
        color: teamColor(game.awayColor),
        record: game.awayRecord,
      }
    : {
        name: game.homeTeam,
        label: game.homeAbbreviation || game.homeTeam,
        logo: game.homeLogo,
        color: teamColor(game.homeColor),
        record: game.homeRecord,
      };
}

/**
 * Experimental Tinder-style pick mode: one matchup per card, swipe left for
 * the away team or right for the home team. Writes through the same draft
 * (`onPick` / `onRandomizeRest`) as the list view, so switching modes keeps
 * every pick.
 */
export default function SwipePicks({
  games,
  picks,
  disabled,
  onPick,
  onRandomizeRest,
  onDone,
}: {
  games: SwipeGame[];
  picks: Record<string, number | undefined>;
  disabled?: boolean;
  onPick: (gameId: string, side: PickSide) => void;
  onRandomizeRest: () => void;
  onDone: () => void;
}) {
  const { impactOccurred, notificationOccurred, selectionChanged } =
    useHaptics();
  const gameIds = games.map(game => game.gameId);
  const total = games.length;
  const pickedCount = gameIds.filter(id => isPicked(picks[id])).length;

  const [index, setIndex] = useState(() =>
    total ? nextUnpickedIndex(gameIds, picks, total - 1) : 0,
  );
  const [history, setHistory] = useState<number[]>([]);
  const [drag, setDrag] = useState({ dx: 0, active: false });
  const [flying, setFlying] = useState<PickSide | null>(null);
  const [rolling, setRolling] = useState<PickSide | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    lastX: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  const busy = flying !== null || rolling !== null;
  const done = index >= total;
  const game = games[index];

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), CELEBRATE_MS);
    return () => clearTimeout(timer);
  }, [celebration]);

  const celebrate = (next: Omit<Celebration, "key">) =>
    setCelebration({ ...next, key: Date.now() });

  const commit = useCallback(
    (side: PickSide, random = false) => {
      if (!game || disabled || flying !== null) return;
      const info = sideInfo(game, side);
      impactOccurred(random ? "heavy" : "medium");
      onPick(game.gameId, side);
      celebrate({
        label: info.label,
        logo: info.logo,
        color: info.color,
        random,
      });
      setFlying(side);
      setTimeout(() => {
        const nextPicks = { ...picks, [game.gameId]: side };
        const next = nextUnpickedIndex(gameIds, nextPicks, index);
        setHistory(stack => [...stack, index]);
        setIndex(next);
        setFlying(null);
        setDrag({ dx: 0, active: false });
        if (next >= total) notificationOccurred("success");
      }, FLY_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, disabled, flying, picks, index, total],
  );

  const roll = useCallback(() => {
    if (!game || disabled || busy) return;
    const side = randomSide();
    let flips = 0;
    const ticker = setInterval(() => {
      flips++;
      selectionChanged();
      setRolling(flips % 2 === 0 ? 0 : 1);
    }, 90);
    setRolling(0);
    setTimeout(() => {
      clearInterval(ticker);
      setRolling(null);
      commit(side, true);
    }, ROLL_MS);
  }, [game, disabled, busy, commit, selectionChanged]);

  const back = useCallback(() => {
    if (busy) return;
    const previous = history.at(-1) ?? Math.min(index, total) - 1;
    if (previous < 0) return;
    selectionChanged();
    setHistory(history.slice(0, -1));
    setIndex(previous);
  }, [busy, history, index, total, selectionChanged]);

  const randomizeRest = () => {
    if (disabled || busy) return;
    const remaining = total - pickedCount;
    if (remaining === 0) return;
    onRandomizeRest();
    notificationOccurred("success");
    celebrate({
      label: `${remaining} pick${remaining === 1 ? "" : "s"}`,
      color: "#7c3aed",
      random: true,
      bulk: remaining,
    });
    setHistory(stack => [...stack, Math.min(index, total - 1)]);
    setIndex(total);
  };

  // Keyboard: ←/→ pick, R rolls, Backspace goes back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") commit(0);
      else if (event.key === "ArrowRight") commit(1);
      else if (event.key.toLowerCase() === "r") roll();
      else if (event.key === "Backspace") back();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, roll, back]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (disabled || busy || !game) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
    setDrag({ dx: 0, active: true });
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    const dt = event.timeStamp - p.lastT;
    if (dt > 0) p.velocity = (event.clientX - p.lastX) / dt;
    p.lastX = event.clientX;
    p.lastT = event.timeStamp;
    setDrag({ dx: event.clientX - p.x, active: true });
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    pointer.current = null;
    const side = sideFromSwipe(event.clientX - p.x, p.velocity);
    if (side === null) setDrag({ dx: 0, active: false });
    else commit(side);
  };

  const lean = flying === null ? drag.dx : flying === 0 ? -600 : 600;
  const intent: PickSide | null =
    rolling ?? (lean <= -40 ? 0 : lean >= 40 ? 1 : null);
  const stampOpacity = Math.min(1, Math.abs(lean) / 110);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {pickedCount === total
              ? "Every pick is in 🔥"
              : `${total - pickedCount} to go`}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {pickedCount} / {total}
          </span>
        </div>
        <Progress
          aria-label="Picks completed"
          className="h-3"
          value={total ? (pickedCount / total) * 100 : 0}
        />
      </div>

      <div
        className="relative mx-auto h-80 w-full sm:h-[23rem] max-w-sm scroll-mt-32 select-none"
        id="swipe-deck"
      >
        {/* Peek of the next card for a deck feel */}
        {!done && games[index + 1] && (
          <div
            aria-hidden
            className="absolute inset-0 translate-y-3 scale-[0.94] rounded-3xl border bg-card opacity-70 shadow"
          />
        )}

        {done ? (
          <div className="swipe-pop absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border bg-gradient-to-br from-primary/20 via-card to-fuchsia-500/20 p-6 text-center shadow-xl">
            <PartyPopper className="size-14 text-primary" />
            <p className="text-2xl font-black tracking-tight">
              All {total} picks locked in
            </p>
            <p className="text-sm text-muted-foreground">
              Add your tiebreaker and enter. Changed your mind? Go back and
              re-swipe any game.
            </p>
            <Button size="lg" onClick={onDone}>
              Review &amp; enter
            </Button>
          </div>
        ) : (
          game && (
            <div
              // A fresh element per game, so the next card appears in place
              // instead of sliding back from where the last one flew.
              key={game.gameId}
              aria-label={`${sideInfo(game, 0).name} at ${sideInfo(game, 1).name}. Swipe left for ${sideInfo(game, 0).label}, right for ${sideInfo(game, 1).label}.`}
              role="group"
              className={cn(
                "swipe-enter absolute inset-0 touch-pan-y overflow-hidden rounded-3xl border bg-card shadow-xl",
                disabled ? "opacity-60" : "cursor-grab active:cursor-grabbing",
              )}
              style={{
                transform: `translateX(${lean}px) rotate(${lean / 18}deg)`,
                transition: drag.active
                  ? "none"
                  : `transform ${FLY_MS}ms cubic-bezier(.2,.8,.2,1)`,
              }}
              onPointerCancel={onPointerUp}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-90"
                style={{
                  background: `linear-gradient(105deg, ${sideInfo(game, 0).color} 0 50%, ${sideInfo(game, 1).color} 50% 100%)`,
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70"
              />

              <div className="relative flex h-full flex-col p-5 text-white">
                <div className="flex items-center justify-between text-xs font-medium text-white/85">
                  <span>{formatKickoffTime(game.kickoff)}</span>
                  <span>
                    Game {index + 1} of {total}
                  </span>
                </div>

                <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {([0, 1] as const).map(side => {
                    const info = sideInfo(game, side);
                    const chosen = picks[game.gameId] === side;
                    return (
                      <div
                        key={side}
                        className={cn(
                          "flex flex-col items-center gap-2 text-center transition-transform duration-150",
                          side === 1 && "order-3",
                          intent === side && "scale-110",
                          intent !== null && intent !== side && "opacity-60",
                        )}
                      >
                        <div className="grid size-24 place-items-center rounded-full bg-white/95 p-3 shadow-lg ring-4 ring-white/30">
                          {info.logo ? (
                            // ESPN team marks are remote images without next/image config.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="size-full object-contain"
                              draggable={false}
                              src={info.logo}
                            />
                          ) : (
                            <span className="text-2xl font-black text-slate-800">
                              {info.label}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black drop-shadow">
                          {info.label}
                        </span>
                        <span className="text-xs text-white/80">
                          {side === 0 ? "Away" : "Home"} · {info.record}
                        </span>
                        {chosen && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-900">
                            Current pick
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <span className="order-2 text-lg font-black text-white/80">
                    @
                  </span>
                </div>

                {game.odds?.details && (
                  <p className="text-center text-xs text-white/75">
                    Line: {game.odds.details}
                  </p>
                )}
                <p className="mt-2 text-center text-xs text-white/70">
                  ← swipe {sideInfo(game, 0).label} · swipe{" "}
                  {sideInfo(game, 1).label} →
                </p>
              </div>

              {/* Drag stamps */}
              {([0, 1] as const).map(side => (
                <div
                  key={side}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-14 rounded-xl border-4 border-white px-3 py-1 text-2xl font-black uppercase text-white shadow-lg",
                    side === 0 ? "right-5 rotate-12" : "left-5 -rotate-12",
                  )}
                  style={{
                    backgroundColor: sideInfo(game, side).color,
                    opacity:
                      rolling === side
                        ? 1
                        : (side === 0 ? lean < 0 : lean > 0)
                          ? stampOpacity
                          : 0,
                  }}
                >
                  {sideInfo(game, side).label}
                </div>
              ))}
            </div>
          )
        )}

        {celebration && (
          <div
            key={celebration.key}
            aria-live="polite"
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          >
            <span
              aria-hidden
              className="swipe-burst absolute size-40 rounded-full"
              style={{ backgroundColor: celebration.color }}
            />
            <div className="swipe-pop relative flex flex-col items-center gap-2">
              <div
                className="grid size-28 place-items-center rounded-full bg-white p-4 shadow-2xl ring-8"
                style={{ ["--tw-ring-color" as string]: celebration.color }}
              >
                {celebration.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-full object-contain"
                    src={celebration.logo}
                  />
                ) : (
                  <Dices className="size-14 text-violet-600" />
                )}
              </div>
              <span
                className="flex items-center gap-2 rounded-full px-4 py-1 text-lg font-black uppercase tracking-wide text-white shadow-lg"
                style={{ backgroundColor: celebration.color }}
              >
                {celebration.random && <Dices className="size-5" />}
                {celebration.bulk
                  ? `${celebration.label} randomized`
                  : `${celebration.label} locked in`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
        <Button
          aria-label="Go back to the previous game"
          disabled={disabled || busy || (history.length === 0 && index === 0)}
          size="icon"
          variant="outline"
          onClick={back}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          className="h-12 font-bold"
          disabled={disabled || busy || done}
          variant="secondary"
          onClick={() => commit(0)}
        >
          ← {game ? sideInfo(game, 0).label : "Away"}
        </Button>
        <Button
          aria-label="Randomize this pick"
          className="size-12 rounded-full"
          disabled={disabled || busy || done}
          size="icon"
          onClick={roll}
        >
          <Dices className={cn("size-6", rolling !== null && "animate-spin")} />
        </Button>
        <Button
          className="h-12 font-bold"
          disabled={disabled || busy || done}
          variant="secondary"
          onClick={() => commit(1)}
        >
          {game ? sideInfo(game, 1).label : "Home"} →
        </Button>
      </div>

      <Button
        className="w-full"
        disabled={disabled || busy || pickedCount === total}
        variant="ghost"
        onClick={randomizeRest}
      >
        <Wand2 className="mr-2 size-4" />
        Randomize the rest
        {pickedCount < total ? ` (${total - pickedCount})` : ""}
      </Button>
    </div>
  );
}
