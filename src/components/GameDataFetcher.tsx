import { useState } from "react";

import { useFetchGameData } from "@/hooks/useFetchGameData";
import { useFetchScoreChanges } from "@/hooks/useFetchScoreChanges";

interface GameDataFetcherProps {
  gameId: number;
}

/**
 * Example component demonstrating how to use the game data fetching hooks
 * for both quarter scores and score changes
 */
export function GameDataFetcher({ gameId }: GameDataFetcherProps) {
  const [selectedFetchType, setSelectedFetchType] = useState<
    "quarter-scores" | "score-changes"
  >("quarter-scores");

  // Using the comprehensive hook
  const {
    handleFetchGameData,
    isLoading: isFetchingData,
    error: fetchDataError,
  } = useFetchGameData();

  // Using the specific score changes hook
  const {
    handleFetchScoreChanges,
    isLoading: isFetchingScoreChanges,
    error: fetchScoreChangesError,
  } = useFetchScoreChanges();

  const handleFetchData = async () => {
    if (selectedFetchType === "quarter-scores") {
      await handleFetchGameData(
        gameId,
        "quarter-scores",
        () => {
          console.log("Quarter scores fetch initiated successfully");
        },
        error => {
          console.error("Failed to fetch quarter scores:", error);
        },
      );
    } else {
      await handleFetchScoreChanges(
        gameId,
        () => {
          console.log("Score changes fetch initiated successfully");
        },
        error => {
          console.error("Failed to fetch score changes:", error);
        },
      );
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Game Data Fetcher</h3>

      <div className="space-y-4">
        {/* Fetch Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Fetch Type:</label>
          <select
            className="border rounded px-3 py-2"
            value={selectedFetchType}
            onChange={e =>
              setSelectedFetchType(
                e.target.value as "quarter-scores" | "score-changes",
              )
            }
          >
            <option value="quarter-scores">Quarter Scores</option>
            <option value="score-changes">Score Changes</option>
          </select>
        </div>

        {/* Game ID Display */}
        <div>
          <label className="block text-sm font-medium mb-2">Game ID:</label>
          <input
            readOnly
            className="border rounded px-3 py-2 bg-gray-100"
            type="number"
            value={gameId}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            disabled={isFetchingData || isFetchingScoreChanges}
            onClick={handleFetchData}
          >
            {isFetchingData || isFetchingScoreChanges
              ? "Fetching..."
              : `Fetch ${selectedFetchType}`}
          </button>
        </div>

        {/* Error Display */}
        {(fetchDataError || fetchScoreChangesError) && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-medium">Error:</p>
            <p>{fetchDataError?.message || fetchScoreChangesError?.message}</p>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="text-sm text-gray-600">
          <h4 className="font-medium mb-2">Usage Instructions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Quarter Scores:</strong> Fetches current quarter scores
              and game completion status
            </li>
            <li>
              <strong>Score Changes:</strong> Fetches detailed score change
              events (only for completed games)
            </li>
            <li>
              <strong>Cooldowns:</strong> Quarter scores: 10 min, Score changes:
              5 min
            </li>
            <li>
              <strong>Prerequisites:</strong> Score changes require the game to
              be completed
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
