import { useState } from "react";

interface UsePickemPicksReturn {
  picks: Record<string, number>;
  setPick: (gameId: string, pick: number) => void;
  pickAtRandom: () => void;
  tiebreakerPoints: string;
  setTiebreakerPoints: (points: string) => void;
  getPickedCount: () => number;
  allPicksMade: boolean;
}

export function usePickemPicks(gameIds: string[]): UsePickemPicksReturn {
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    gameIds.forEach(id => {
      initial[id] = -1;
    });
    return initial;
  });
  const [tiebreakerPoints, setTiebreakerPoints] = useState("");

  const setPick = (gameId: string, pick: number) => {
    setPicks(prev => ({ ...prev, [gameId]: pick }));
  };

  const pickAtRandom = () => {
    setPicks(previous =>
      Object.fromEntries(
        gameIds.map(id => [
          id,
          previous[id] === 0 || previous[id] === 1
            ? previous[id]
            : Math.random() < 0.5
              ? 0
              : 1,
        ]),
      ),
    );
    setTiebreakerPoints(
      previous => previous || (Math.floor(Math.random() * 51) + 20).toString(),
    );
  };

  const getPickedCount = () =>
    gameIds.filter(id => picks[id] === 0 || picks[id] === 1).length;
  const allPicksMade =
    gameIds.length > 0 && getPickedCount() === gameIds.length;

  return {
    picks,
    setPick,
    pickAtRandom,
    tiebreakerPoints,
    setTiebreakerPoints,
    getPickedCount,
    allPicksMade,
  };
}
