# Game Data Fetching Hooks

This document describes the hooks available for fetching game data (quarter scores and score changes) from the blockchain using Chainlink Functions.

## Overview

The system provides three main hooks for fetching game data:

1. **`useFetchGameData`** - Comprehensive hook supporting both quarter scores and score changes
2. **`useFetchScoreChanges`** - Specialized hook for fetching score changes only
3. **`useSyncScoresOnchain`** - Legacy hook for backward compatibility (quarter scores only)

## Hook Details

### `useFetchGameData`

The main hook that supports fetching both types of game data.

```typescript
import { useFetchGameData } from "@/hooks/useFetchGameData";

const { handleFetchGameData, isLoading, error } = useFetchGameData();

// Fetch quarter scores
await handleFetchGameData(gameId, "quarter-scores", onSuccess, onError);

// Fetch score changes
await handleFetchGameData(gameId, "score-changes", onSuccess, onError);
```

**Parameters:**

- `gameId: number` - The game ID to fetch data for
- `fetchType: "quarter-scores" | "score-changes"` - Type of data to fetch
- `onSuccess?: () => void` - Success callback
- `onError?: (error: Error) => void` - Error callback

**Returns:**

- `handleFetchGameData` - Function to initiate data fetching
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state

### `useFetchScoreChanges`

Specialized hook for fetching score changes only.

```typescript
import { useFetchScoreChanges } from "@/hooks/useFetchScoreChanges";

const { handleFetchScoreChanges, isLoading, error } = useFetchScoreChanges();

await handleFetchScoreChanges(gameId, onSuccess, onError);
```

**Parameters:**

- `gameId: number` - The game ID to fetch score changes for
- `onSuccess?: () => void` - Success callback
- `onError?: (error: Error) => void` - Error callback

**Returns:**

- `handleFetchScoreChanges` - Function to initiate score changes fetching
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state

### `useSyncScoresOnchain` (Legacy)

Legacy hook for backward compatibility. Only fetches quarter scores.

```typescript
import { useSyncScoresOnchain } from "@/hooks/useSyncScoresOnchain";

const { handleSyncScoresOnchain, isLoading, error } = useSyncScoresOnchain();

await handleSyncScoresOnchain(gameId, onSuccess, onError);
```

## Data Types

### Quarter Scores

Fetches the following data:

- Current quarter scores for home and away teams
- Last digits of scores for each quarter (used in boxes calculations)
- Game completion status
- Number of completed quarters

### Score Changes

Fetches detailed score change events:

- Individual scoring plays with timestamps
- Last digits of scores at each change
- Up to 64 score changes per game (packed efficiently)

## Cooldowns and Prerequisites

### Quarter Scores

- **Cooldown:** 10 minutes between requests
- **Prerequisites:** None (can be fetched at any time)

### Score Changes

- **Cooldown:** 5 minutes between requests
- **Prerequisites:**
  - Game must be completed (`isGameCompleted` returns true)
  - Score changes must not already be stored (`getTotalScoreChanges` returns 0)

## Error Handling

The hooks provide comprehensive error handling for common scenarios:

- **Cooldown errors:** "Please wait X more minutes before requesting..."
- **Game not completed:** "Game must be completed before fetching score changes"
- **Already stored:** "Score changes are already stored for this game"
- **Chainlink errors:** Subscription, balance, and parameter validation errors
- **Network errors:** Connection and transaction failures

## Usage Examples

### Basic Usage

```typescript
import { useFetchGameData } from "@/hooks/useFetchGameData";

function MyComponent({ gameId }: { gameId: number }) {
  const { handleFetchGameData, isLoading, error } = useFetchGameData();

  const handleFetchQuarterScores = async () => {
    await handleFetchGameData(
      gameId,
      "quarter-scores",
      () => console.log("Quarter scores fetched!"),
      (error) => console.error("Error:", error.message)
    );
  };

  const handleFetchScoreChanges = async () => {
    await handleFetchGameData(
      gameId,
      "score-changes",
      () => console.log("Score changes fetched!"),
      (error) => console.error("Error:", error.message)
    );
  };

  return (
    <div>
      <button onClick={handleFetchQuarterScores} disabled={isLoading}>
        Fetch Quarter Scores
      </button>
      <button onClick={handleFetchScoreChanges} disabled={isLoading}>
        Fetch Score Changes
      </button>
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

### With Toast Notifications

```typescript
import { toast } from "react-hot-toast";
import { useFetchGameData } from "@/hooks/useFetchGameData";

function MyComponent({ gameId }: { gameId: number }) {
  const { handleFetchGameData, isLoading, error } = useFetchGameData();

  const handleFetchData = async (fetchType: "quarter-scores" | "score-changes") => {
    await handleFetchGameData(
      gameId,
      fetchType,
      () => {
        toast.success(`${fetchType} fetch initiated successfully!`);
      },
      (error) => {
        toast.error(error.message);
      }
    );
  };

  return (
    <div>
      <button onClick={() => handleFetchData("quarter-scores")}>
        Fetch Quarter Scores
      </button>
      <button onClick={() => handleFetchData("score-changes")}>
        Fetch Score Changes
      </button>
    </div>
  );
}
```

## Contract Methods

The hooks interact with the following contract methods:

### Contests Contract

- `fetchFreshGameScores(uint64 subscriptionId, uint32 gasLimit, bytes32 jobId, uint256 gameId)`
- `fetchFreshScoreChanges(uint64 subscriptionId, uint32 gasLimit, bytes32 jobId, uint256 gameId)`

### GameScoreOracle Contract

- `timeUntilQuarterScoresCooldownExpires(uint256 gameId)`
- `timeUntilScoreChangesCooldownExpires(uint256 gameId)`
- `isGameCompleted(uint256 gameId)`
- `getTotalScoreChanges(uint256 gameId)`

## Migration Guide

If you're currently using `useSyncScoresOnchain`, you can migrate to the new hooks:

### Before (Legacy)

```typescript
import { useSyncScoresOnchain } from "@/hooks/useSyncScoresOnchain";

const { handleSyncScoresOnchain } = useSyncScoresOnchain();
await handleSyncScoresOnchain(gameId, onSuccess, onError);
```

### After (New)

```typescript
import { useFetchGameData } from "@/hooks/useFetchGameData";

const { handleFetchGameData } = useFetchGameData();
await handleFetchGameData(gameId, "quarter-scores", onSuccess, onError);
```

The legacy hook is still available for backward compatibility but is marked as deprecated.
