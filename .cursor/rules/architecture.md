---
description: React architecture patterns for this project - hooks-first approach with simple components
globs: src/**/*.tsx, src/**/*.ts
alwaysApply: true
---

# Architecture: Hooks-First with Simple Components

This project follows a hooks-first architecture where complex logic lives in custom hooks and components remain simple UI renderers.

## Directory Structure

```
src/
├── hooks/           # All custom hooks with business logic
├── components/      # Reusable UI components (minimal logic)
│   ├── contest/     # Football boxes contest components
│   ├── pickem/      # NFL Pick'em components
│   └── ui/          # shadcn/ui primitives
├── lib/             # Pure utility functions
├── constants/       # Contract addresses, ABIs, chain config
├── providers/       # React context providers (Thirdweb, etc.)
└── app/             # Next.js pages (compose hooks + components)
```

## When to Create a Hook

Create a custom hook when you need:

1. **Contract interactions** - Reading from or writing to smart contracts (thirdweb)
2. **State management** - Complex state with multiple related pieces
3. **Side effects** - Data fetching, subscriptions, Chainlink oracle calls
4. **Reusable logic** - Logic used in multiple components
5. **External service integration** - Thirdweb, Farcaster, Redis cache, etc.

### Hook Guidelines

- Hooks should return an object with clearly named values and functions
- Keep hooks focused on a single concern (e.g., `useClaimBoxes` handles only box claiming)
- Hooks can compose other hooks internally
- Name hooks with `use` prefix describing their purpose

```typescript
// Good: Focused hook with clear return type
export function useClaimBoxes() {
  return { handleClaimBoxes, isLoading, error, supportsBatching };
}

// Good: Hook for contract read/write operations
export function useProcessPayouts() {
  return { handleProcessPayouts, isLoading, error };
}

// Bad: Doing too many unrelated things
export function useContestStuff() {
  /* ... */
}
```

## When to Create a Component

Create a component when you need:

1. **Reusable UI** - UI patterns used in multiple places
2. **Visual boundaries** - Distinct visual sections (cards, grids, forms)
3. **Prop isolation** - Encapsulate a subset of props for cleaner parent components

### Component Guidelines

- Components should be primarily concerned with **rendering**
- Props should be simple values, not complex objects when possible
- Avoid `useEffect`, `useCallback`, `useMemo` in components unless necessary for UI
- Components can use hooks but should not define business logic inline

```tsx
// Good: Simple component that renders from props
export function PayoutsCard({ contest, scoreChangeCount }: Props) {
  const payouts = getQuartersOnlyPayouts(contest.totalRewards);
  const { formattedValue } = useFormattedCurrency({
    amount: BigInt(Math.floor(payouts.q1.amount)),
    currencyAddress: contest.boxCost.currency,
  });

  return (
    <Card>
      <CardContent>{formattedValue}</CardContent>
    </Card>
  );
}

// Good: Grid component receiving all data as props
export function FootballGrid({
  contest,
  boxOwners,
  gameScore,
  selectedBoxes,
  onBoxClick,
  onClaimBoxes,
  isClaimingBoxes,
}: Props) {
  return <Card>{/* Render 10x10 grid based on props */}</Card>;
}

// Bad: Component with embedded business logic and contract calls
export function FootballGrid({ contestId }: { contestId: string }) {
  const [contest, setContest] = useState(null);
  const [boxOwners, setBoxOwners] = useState([]);
  useEffect(() => {
    /* fetch contest data, box owners, game scores... */
  }, []);
  // ... lots of logic ...
}
```

## Page/Route Components

Page components in `src/app/` should:

1. **Orchestrate hooks** - Call the necessary hooks for the page
2. **Compose components** - Pass hook data to UI components
3. **Handle conditional rendering** - Loading, error, and success states

```tsx
// Good: Page orchestrates hooks and composes components
export default function ContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [gameScore, setGameScore] = useState<GameScore | null>(null);
  const [boxOwners, setBoxOwners] = useState<BoxOwner[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);

  // Use focused hooks for specific actions
  const { handleClaimBoxes, isLoading: isClaimingBoxes } = useClaimBoxes();
  const { handleProcessPayouts, isLoading: isProcessingPayouts } =
    useProcessPayouts();
  const { handleFetchGameData, isLoading: isSyncingScores } =
    useFetchGameData();

  // Fetch contest data on mount
  useEffect(() => {
    const fetchContestData = async () => {
      const response = await fetch(`/api/contest/${contestId}`);
      const data = await response.json();
      setContest(data);
      // ...
    };
    fetchContestData();
  }, [contestId]);

  if (!contest) return <LoadingState />;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <FootballGrid
          contest={contest}
          boxOwners={boxOwners}
          gameScore={gameScore}
          selectedBoxes={selectedBoxes}
          onBoxClick={handleBoxClick}
          onClaimBoxes={() => handleClaimBoxes(selectedBoxes, contest.id)}
          isClaimingBoxes={isClaimingBoxes}
        />
      </div>
      <div className="space-y-6">
        <GameScores contest={contest} gameScore={gameScore} />
        <PayoutsCard contest={contest} />
        <ContestActions
          contest={contest}
          onProcessPayouts={handleProcessPayouts}
          isProcessingPayouts={isProcessingPayouts}
        />
      </div>
    </div>
  );
}
```

## Thirdweb Hook Usage

This project uses **thirdweb React SDK** for blockchain interactions. Thirdweb provides hooks that handle caching, loading states, and error handling.

### When to Use Thirdweb Hooks

Use thirdweb hooks for:

1. **Contract reads** - Reading state from smart contracts
2. **Contract writes** - Sending transactions
3. **Wallet state** - Connected account, wallet capabilities
4. **Social profiles** - Farcaster/ENS profile resolution

### Thirdweb Guidelines

- **Use thirdweb hooks for contract interactions**: `useReadContract`, `useSendTransaction`, `useActiveAccount`
- **Wrap contract logic in custom hooks**: Create app-specific hooks that use thirdweb hooks internally
- **Handle wallet capabilities**: Check for batching support (EIP-5792) before combining transactions

```typescript
// Good: Custom hook wrapping thirdweb for app-specific logic
export function useClaimBoxes() {
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendAndConfirmTransaction();
  const { data: capabilities } = useCapabilities();

  const handleClaimBoxes = async (boxNumbers: number[], contestId: number) => {
    if (!account) throw new Error("No wallet connected");

    const tokenIds = boxNumbers.map(boxNumber => boxNumber + contestId * 100);
    const supportsBatching = capabilities && !capabilities.message;

    if (supportsBatching) {
      // Batch approval + claim in single transaction
      // ...
    } else {
      // Sequential approval then claim
      // ...
    }
  };

  return { handleClaimBoxes, isLoading, error, supportsBatching };
}
```

```typescript
// Good: Hook for Pick'em contract interactions
export function usePickemContract() {
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  const submitPredictions = async (params: {
    contestId: number;
    picks: number[];
    tiebreakerPoints: number;
    entryFee: string;
    currency: string;
  }) => {
    // Check allowance, prepare transactions, handle batching...
    const tx = prepareContractCall({
      contract: pickemContract,
      method: "submitPredictions",
      params: [
        BigInt(params.contestId),
        params.picks,
        BigInt(params.tiebreakerPoints),
      ],
      value,
    });

    const result = await sendTx(tx);
    return waitForReceipt({
      client,
      chain,
      transactionHash: result.transactionHash,
    });
  };

  return {
    submitPredictions,
    createContest,
    claimPrize,
    getContest,
    getContestLeaderboard,
    // ... other contract methods
  };
}
```

### Contract Read Patterns

For contract reads that don't need reactivity, use `readContract` directly:

```typescript
// Good: Direct read for one-time data fetch
const getContest = async (contestId: number) => {
  const result = await readContract({
    contract: pickemContract,
    method: "getContest",
    params: [BigInt(contestId)],
  });
  return result;
};
```

For reactive data, use `useReadContract`:

```typescript
// Good: Reactive read that updates when contract changes
const { data: balance, isLoading } = useReadContract({
  contract: tokenContract,
  method: "balanceOf",
  params: [account?.address],
});
```

## API Route Usage

Use Next.js API routes for:

1. **Server-side caching** - Redis cache for contract data
2. **External API calls** - ESPN data, Chainlink Functions results
3. **Aggregating data** - Combining multiple contract reads

```typescript
// Good: API route with caching
// src/app/api/contest/[contestId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { contestId: string } },
) {
  const cacheKey = getContestCacheKey(params.contestId, chainId);

  // Try cache first
  const cached = await redis?.get(cacheKey);
  if (cached) return Response.json(JSON.parse(cached));

  // Fetch from contract
  const contestData = await fetchContestFromContract(params.contestId);

  // Cache for 60 seconds
  await redis?.set(cacheKey, JSON.stringify(contestData), { ex: 60 });

  return Response.json(contestData);
}
```

## Utilities vs Hooks

Use `src/lib/` for **pure functions** with no React dependencies:

- Formatting functions (`formatEther`, `formatTokenAmount`)
- Calculation functions (`getQuartersOnlyPayouts`, `getScoreChangesPayouts`)
- Helper functions (`cn` for classnames, `getPayoutStrategyType`)
- Cache key generators (`getContestCacheKey`, `getPayoutTxKey`)

```typescript
// Good: Pure utility function in lib/payout-utils.ts
export function getQuartersOnlyPayouts(totalRewards: number) {
  return {
    q1: { percentage: 15, amount: totalRewards * 0.15, label: "Q1 (15%)" },
    q2: { percentage: 20, amount: totalRewards * 0.2, label: "Q2 (20%)" },
    q3: { percentage: 15, amount: totalRewards * 0.15, label: "Q3 (15%)" },
    q4: { percentage: 50, amount: totalRewards * 0.5, label: "Final (50%)" },
  };
}
```

Use `src/hooks/` for anything that uses React primitives:

- `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`
- Thirdweb hooks (`useActiveAccount`, `useSendTransaction`, `useReadContract`)
- Other hooks (`useParams`, `useRouter`, etc.)

## Existing Hooks Reference

| Hook                      | Purpose                                       | Returns                                                                  |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `usePickemContract`       | All Pick'em contract interactions             | `{ createContest, submitPredictions, claimPrize, getContest, ... }`      |
| `useClaimBoxes`           | Claim boxes in football squares               | `{ handleClaimBoxes, isLoading, error, supportsBatching }`               |
| `useProcessPayouts`       | Process contest payouts                       | `{ handleProcessPayouts, isLoading, error }`                             |
| `useFetchGameData`        | Fetch quarter scores/score changes via oracle | `{ handleFetchGameData, isLoading, error }`                              |
| `useFetchScoreChanges`    | Fetch score changes (specialized)             | `{ handleFetchScoreChanges, isLoading, error }`                          |
| `useRandomNumbers`        | Request VRF random numbers for grid           | `{ handleRequestRandomNumbers, isLoading, error }`                       |
| `useTokens`               | Fetch/search ERC20 tokens                     | `{ tokens, loading, hasMore, fetchTokens, loadMoreTokens, searchQuery }` |
| `useUserProfile`          | Resolve Farcaster/ENS profile from address    | `{ profile, isLoading, error }`                                          |
| `useFormattedCurrency`    | Format token amounts with symbol              | `{ formattedValue, isLoading }`                                          |
| `useWeekResultsFinalized` | Check if oracle results are ready             | `{ isFinalized, isLoading, error }`                                      |
| `usePickemNFT`            | Pick'em NFT metadata and ownership            | `{ getNFTMetadata, getNFTPrediction, getUserNFTBalance, ... }`           |

## Anti-Patterns to Avoid

1. **Logic in components** - Move to hooks
2. **Inline fetching in components** - Create a hook instead
3. **Prop drilling** - Consider if a hook can provide the data directly
4. **Giant components** - Break into smaller components + hooks
5. **Duplicate logic** - Extract to a shared hook or utility
6. **Contract calls without hooks** - Always wrap in custom hooks for reusability
7. **Mixing concerns** - Keep contract interactions, UI state, and rendering separate
8. **Direct thirdweb hook usage in components** - Wrap in app-specific hooks first
