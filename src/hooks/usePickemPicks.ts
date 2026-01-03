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
    const randomPicks: Record<string, number> = {};
    gameIds.forEach(id => {
      randomPicks[id] = Math.random() < 0.5 ? 0 : 1;
    });
    setPicks(randomPicks);
    setTiebreakerPoints((Math.floor(Math.random() * 51) + 20).toString());
  };

  const getPickedCount = () => {
    return Object.values(picks).filter(p => p !== -1).length;
  };

  const allPicksMade = Object.values(picks).every(p => p !== -1);

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

