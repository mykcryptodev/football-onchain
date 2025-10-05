import { useFetchGameData } from "./useFetchGameData";

/**
 * Hook for fetching score changes onchain by calling fetchFreshScoreChanges on the contests contract.
 * This triggers a Chainlink oracle request to fetch score changes for completed games.
 */
export function useFetchScoreChanges() {
  const { handleFetchGameData, isLoading, error } = useFetchGameData();

  const handleFetchScoreChanges = async (
    gameId: number,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ) => {
    await handleFetchGameData(gameId, "score-changes", onSuccess, onError);
  };

  return {
    handleFetchScoreChanges,
    isLoading,
    error,
  };
}
