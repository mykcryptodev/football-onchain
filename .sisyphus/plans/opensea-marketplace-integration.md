# OpenSea Marketplace Integration for Boxes

## TL;DR

> **Quick Summary**: Enable users to list, buy, and manage box NFT sales directly within the app using OpenSea's API, with visual "For Sale" indicators on the grid.
>
> **Deliverables**:
>
> - In-app sell flow with price input, currency selection (ETH/USDC), USD display
> - Cancel listing functionality
> - Private/reserved listings for specific addresses
> - Buy flow for listed boxes
> - Orange/amber "For Sale" visual indicator on grid boxes
>
> **Estimated Effort**: Large (3-4 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6

---

## Context

### Original Request

Enable users to tap on their box in the grid and, from within the modal, put their box on sale via OpenSea's API. Features include:

- Only box owner sees sell interface
- Price input with USD display
- ETH or USDC currency options
- "For Sale" visual indicator (orange/gold border with tag)
- Cancel listing capability
- Direct/reserved listings for specific addresses
- Buy directly from listed boxes

### Research Summary

**OpenSea API Findings**:

- SDK: `opensea-js` recommended for all operations
- Collection slug: `super-bowl-squares-onchain`
- Chain: Base (chain ID 8453) / Base Sepolia (84532)
- Seaport contract: `0x0000000000000068f116a894984e2db1123eb395`
- Supported currencies: ETH (default), WETH, USDC
- Private listings: Supported via `buyerAddress` parameter
- Platform fee: 1% (waived for private listings)

**Current Codebase State**:

- `UserProfileModal.tsx` already has "Sell Box" link to OpenSea website
- Box styling uses `ring-sky-400/80` + badge for "You" state
- USD pricing available via `useTokenPricing` hook
- Token selection pattern in `CreateContestForm.tsx`

### Design Decisions

| Decision       | Choice                               | Rationale                                                |
| -------------- | ------------------------------------ | -------------------------------------------------------- |
| Badge priority | "For Sale" takes priority over "You" | Implies ownership since only owner can list              |
| UI placement   | Inline below box info                | Always visible for owners, no extra modal navigation     |
| Currencies     | ETH and USDC only                    | OpenSea Base chain defaults; simplicity per user request |

---

## Work Objectives

### Core Objective

Integrate OpenSea marketplace functionality into the box modal, allowing owners to list, manage, and buyers to purchase boxes without leaving the app.

### Concrete Deliverables

1. `src/hooks/useOpenSeaSDK.ts` - SDK initialization hook
2. `src/hooks/useBoxListings.ts` - Fetch listings for contest boxes
3. `src/hooks/useCreateListing.ts` - Create listing mutation with cache invalidation
4. `src/hooks/useCancelListing.ts` - Cancel listing mutation with cache invalidation
5. `src/hooks/useFulfillOrder.ts` - Buy listing mutation with cache invalidation
6. `src/app/api/opensea/listings/[contestId]/route.ts` - Listings API proxy **with Redis caching**
7. `src/app/api/opensea/listings/[contestId]/refresh/route.ts` - Cache invalidation endpoint
8. `src/components/contest/SellBoxForm.tsx` - Sell form component
9. `src/components/contest/BuyBoxSection.tsx` - Buy section component
10. Updated `src/lib/redis.ts` with listings cache key helper and TTL
11. Updated `src/lib/cache-utils.ts` with `invalidateListingsCache()`
12. Updated `src/lib/query-keys.ts` with `boxListings` key
13. Updated `FootballGrid.tsx` with "For Sale" styling
14. Updated `UserProfileModal.tsx` with integrated sell/buy UI

### Definition of Done

- [ ] `bun run build` completes without errors
- [ ] User can list their box for sale with ETH or USDC
- [ ] User sees USD equivalent while entering price
- [ ] User can create private listing for specific address
- [ ] User can cancel their listing
- [ ] Non-owner can buy listed box
- [ ] Grid shows orange border + "For Sale" tag on listed boxes
- [ ] Box that belongs to current user and is for sale shows "For Sale" (not "You")

### Must Have

- OpenSea SDK integration with proper chain detection
- Sell form with price, currency, USD display, duration
- Private listing option with address input
- Cancel listing with confirmation
- Buy button with approval flow for USDC
- Visual "For Sale" indicator on grid
- Proper error handling for all API calls
- **Redis caching for listings data** to minimize OpenSea API calls
- **Cache invalidation** on listing creation, cancellation, and purchase

### Must NOT Have (Guardrails)

- No support for currencies beyond ETH/USDC
- No auction-style listings (fixed price only)
- No bulk listing of multiple boxes
- No showing "You" badge when box is for sale (For Sale takes priority)
- No third-party price APIs (use existing `useTokenPricing`)
- No changes to smart contracts
- No direct OpenSea API calls from client (always go through cached API route)

---

## Caching Architecture

### Why Cache?

OpenSea API has rate limits and latency. Caching listings data in Redis:

- Reduces API calls by ~95% (serve from cache on grid load)
- Improves UX with faster page loads
- Prevents rate limit issues during high traffic

### Cache Strategy

| Cache Layer                                           | Purpose                   | TTL                    | Invalidation Trigger                    |
| ----------------------------------------------------- | ------------------------- | ---------------------- | --------------------------------------- |
| **Redis** (`opensea:listings:{chainId}:{contestId}`)  | Server-side listing cache | 5 min                  | Listing created, canceled, or fulfilled |
| **React Query** (`boxListings:{chainId}:{contestId}`) | Client-side listing cache | stale-while-revalidate | Same as Redis + window focus            |

### Cache Flow

```
User loads contest page
        │
        ▼
React Query → GET /api/opensea/listings/{contestId}
        │
        ▼
API Route checks Redis cache
        │
        ├── HIT → Return cached listings immediately
        │
        └── MISS → Fetch from OpenSea API
                   │
                   ▼
              Cache in Redis (5 min TTL)
                   │
                   ▼
              Return to client
```

### Cache Invalidation Flow

```
User creates/cancels/buys listing
        │
        ▼
Mutation hook calls SDK
        │
        ▼
On success:
├── POST /api/opensea/listings/{contestId}/refresh (clears Redis)
│
└── queryClient.invalidateQueries(['boxListings', ...]) (clears React Query)
        │
        ▼
Next page load fetches fresh data from OpenSea
```

### Key Files for Caching

| File                                                        | Additions                                             |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `src/lib/redis.ts`                                          | `getListingsCacheKey()`, `CACHE_TTL.OPENSEA_LISTINGS` |
| `src/lib/cache-utils.ts`                                    | `invalidateListingsCache()`                           |
| `src/lib/query-keys.ts`                                     | `boxListings: (contestId) => [...]`                   |
| `src/app/api/opensea/listings/[contestId]/route.ts`         | GET with Redis caching                                |
| `src/app/api/opensea/listings/[contestId]/refresh/route.ts` | POST to invalidate Redis                              |

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (bun test available)
- **User wants tests**: Manual verification for this feature
- **Framework**: bun test (existing)

### Manual Verification Protocol

Each task includes verification steps that can be executed via Playwright browser automation or direct observation.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: SDK Setup & API Route (no dependencies)
└── Task 3: Grid "For Sale" Styling Types (no dependencies)

Wave 2 (After Wave 1):
├── Task 2: Listings Hook (depends: 1)
├── Task 4: Create Listing Hook (depends: 1)
├── Task 5: Cancel Listing Hook (depends: 1)
└── Task 6: Fulfill Order Hook (depends: 1)

Wave 3 (After Wave 2):
├── Task 7: SellBoxForm Component (depends: 4, 5)
├── Task 8: BuyBoxSection Component (depends: 6)
└── Task 9: FootballGrid Styling (depends: 2, 3)

Wave 4 (After Wave 3):
└── Task 10: UserProfileModal Integration (depends: 7, 8, 9)

Critical Path: Task 1 → Task 4 → Task 7 → Task 10
```

### Dependency Matrix

| Task | Depends On | Blocks     | Can Parallelize With |
| ---- | ---------- | ---------- | -------------------- |
| 1    | None       | 2, 4, 5, 6 | 3                    |
| 2    | 1          | 9          | 4, 5, 6              |
| 3    | None       | 9          | 1                    |
| 4    | 1          | 7          | 2, 5, 6              |
| 5    | 1          | 7          | 2, 4, 6              |
| 6    | 1          | 8          | 2, 4, 5              |
| 7    | 4, 5       | 10         | 8, 9                 |
| 8    | 6          | 10         | 7, 9                 |
| 9    | 2, 3       | 10         | 7, 8                 |
| 10   | 7, 8, 9    | None       | None (final)         |

---

## TODOs

- [ ] 1. Setup OpenSea SDK & API Infrastructure with Redis Caching

  **What to do**:
  - Install `opensea-js` package
  - Add `OPENSEA_API_KEY` to `.env.example` and `.env.local`
  - Create `src/hooks/useOpenSeaSDK.ts` that initializes SDK with chain detection
  - Create `src/app/api/opensea/listings/[contestId]/route.ts` to proxy listing requests **with Redis caching**
  - Create `src/app/api/opensea/listings/[contestId]/refresh/route.ts` for cache invalidation
  - Add OpenSea types to `src/components/contest/types.ts`
  - Add cache key helpers to `src/lib/redis.ts`:
    - `getListingsCacheKey(contestId, chainId)` → `opensea:listings:{chainId}:{contestId}`
  - Add cache TTL constant: `CACHE_TTL.OPENSEA_LISTINGS = 300` (5 minutes)
  - Add cache invalidation helpers to `src/lib/cache-utils.ts`:
    - `invalidateListingsCache(contestId, queryClient, chainId)`

  **Caching Strategy**:
  - Cache listings per contest for 5 minutes (reduces API calls significantly)
  - Use `safeRedisOperation` wrapper for error handling
  - Return cached data immediately, fetch fresh on cache miss
  - Invalidate via `/refresh` endpoint (called by mutation hooks)

  **Must NOT do**:
  - Do not hardcode API keys
  - Do not use direct API calls without the SDK for mutations
  - Do not call OpenSea API on every request (use cache)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Infrastructure setup with well-defined patterns
  - **Skills**: `[]`
    - No special skills needed for package installation and hook creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Tasks 2, 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hooks/usePickemContract.ts:1-50` - Hook initialization pattern with chain detection
  - `src/providers/ThirdwebProvider.tsx` - Provider pattern for SDK initialization
  - `src/lib/redis.ts:17-51` - Cache key helpers and TTL constants pattern
  - `src/lib/cache-utils.ts:26-42` - `invalidateContestCaches` pattern for dual cache invalidation
  - `src/app/api/contest/[contestId]/refresh/route.ts` - Refresh endpoint pattern

  **API/Type References**:
  - `src/components/contest/types.ts` - Where to add OpenSea listing types
  - `src/constants/index.ts:1-30` - Chain-specific contract addresses pattern

  **External References**:
  - OpenSea SDK: `https://github.com/ProjectOpenSea/opensea-js`
  - Chain enum: Use `Chain.Base` and `Chain.BaseSepolia` from opensea-js

  **Acceptance Criteria**:

  ```bash
  # Verify package installed
  grep "opensea-js" package.json
  # Expected: "opensea-js": "^X.X.X"

  # Verify env example updated
  grep "OPENSEA_API_KEY" .env.example
  # Expected: OPENSEA_API_KEY=

  # Verify hook file exists
  ls src/hooks/useOpenSeaSDK.ts
  # Expected: file exists

  # Verify API route exists with caching
  ls src/app/api/opensea/listings/\[contestId\]/route.ts
  # Expected: file exists
  grep "redis" src/app/api/opensea/listings/\[contestId\]/route.ts
  # Expected: redis caching code

  # Verify refresh route exists
  ls src/app/api/opensea/listings/\[contestId\]/refresh/route.ts
  # Expected: file exists

  # Verify cache key helper added
  grep "getListingsCacheKey" src/lib/redis.ts
  # Expected: function definition

  # Verify cache TTL added
  grep "OPENSEA_LISTINGS" src/lib/redis.ts
  # Expected: TTL constant

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add SDK infrastructure with Redis-cached listings API`
  - Files: `package.json`, `bun.lockb`, `.env.example`, `src/hooks/useOpenSeaSDK.ts`, `src/app/api/opensea/listings/[contestId]/route.ts`, `src/app/api/opensea/listings/[contestId]/refresh/route.ts`, `src/lib/redis.ts`, `src/lib/cache-utils.ts`, `src/components/contest/types.ts`

---

- [ ] 2. Create useBoxListings Hook

  **What to do**:
  - Create `src/hooks/useBoxListings.ts`
  - Fetch all listings for boxes in a contest via the **cached** API route
  - Return a Map of `tokenId → OpenSeaListing` for O(1) lookup
  - Use React Query with 30-second polling (API route serves cached data, so this is cheap)
  - Handle loading, error, and empty states
  - Add query key to `src/lib/query-keys.ts`: `boxListings: (contestId) => ["boxListings", chain.id, contestId]`

  **Must NOT do**:
  - Do not fetch listings for all boxes in collection (only contest range)
  - Do not call OpenSea API directly from client (use cached API route)
  - Do not refetch more frequently than 30 seconds (cache handles freshness)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single hook file with established patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/hooks/useContestData.ts:1-80` - React Query hook with polling pattern
  - `src/hooks/useBoxesContests.ts:1-40` - Contest data fetching pattern
  - `src/lib/query-keys.ts` - Query key definitions

  **API/Type References**:
  - `src/components/contest/types.ts:OpenSeaListing` - Listing type (added in Task 1)

  **Acceptance Criteria**:

  ```bash
  # Verify hook file exists with correct exports
  grep "export function useBoxListings" src/hooks/useBoxListings.ts
  # Expected: export function useBoxListings

  # Verify React Query usage
  grep "useQuery" src/hooks/useBoxListings.ts
  # Expected: useQuery or useSuspenseQuery

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add useBoxListings hook for fetching contest listings`
  - Files: `src/hooks/useBoxListings.ts`, `src/lib/query-keys.ts`

---

- [ ] 3. Add OpenSea Listing Types and For Sale Styling Constants

  **What to do**:
  - Add `OpenSeaListing` interface to `src/components/contest/types.ts`
  - Add `ListingPrice`, `ListingMaker` helper types
  - Define "For Sale" color constants (amber-400/500) in a comment for reference
  - Add `isForSale?: boolean` field to relevant types if needed

  **Must NOT do**:
  - Do not modify existing types in breaking ways
  - Do not add styling to FootballGrid yet (that's Task 9)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type definitions only
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/contest/types.ts:1-100` - Existing type definitions pattern

  **External References**:
  - OpenSea API response shape: See librarian research output above

  **Acceptance Criteria**:

  ```bash
  # Verify OpenSeaListing type exists
  grep "interface OpenSeaListing" src/components/contest/types.ts
  # Expected: export interface OpenSeaListing

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: NO (groups with Task 1)

---

- [ ] 4. Create useCreateListing Hook

  **What to do**:
  - Create `src/hooks/useCreateListing.ts`
  - Use OpenSea SDK to create listings
  - Accept parameters: tokenId, price, currency (ETH/USDC), buyerAddress (optional), duration, contestId
  - Handle ERC721 approval check for Seaport contract
  - Request approval if not already approved
  - Return mutation with loading, error, success states
  - **On success: Invalidate both Redis and React Query caches** using `invalidateListingsCache(contestId, queryClient)`
  - Call `/api/opensea/listings/{contestId}/refresh` to clear Redis cache

  **Must NOT do**:
  - Do not support currencies other than ETH and USDC
  - Do not skip approval check
  - Do not use direct API calls (use SDK)
  - Do not forget to invalidate cache on success

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard mutation hook with SDK integration
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/hooks/useClaimBoxes.ts:1-100` - Mutation hook with approval flow pattern
  - `src/hooks/useProcessPayouts.ts:1-50` - Simple mutation hook pattern

  **API/Type References**:
  - `src/constants/index.ts:boxes` - Boxes contract address
  - `src/constants/index.ts:usdc` - USDC address by chain

  **External References**:
  - OpenSea SDK createListing: `sdk.createListing({ asset, accountAddress, amount, paymentTokenAddress?, buyerAddress?, expirationTime? })`
  - Seaport contract (cross-chain): `0x0000000000000068f116a894984e2db1123eb395`

  **Acceptance Criteria**:

  ```bash
  # Verify hook file exists
  grep "export function useCreateListing" src/hooks/useCreateListing.ts
  # Expected: export function useCreateListing

  # Verify useMutation usage
  grep "useMutation" src/hooks/useCreateListing.ts
  # Expected: useMutation

  # Verify approval check
  grep -i "approv" src/hooks/useCreateListing.ts
  # Expected: approval-related code

  # Verify cache invalidation
  grep -i "invalidate\|refresh" src/hooks/useCreateListing.ts
  # Expected: cache invalidation code

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add useCreateListing hook with approval flow and cache invalidation`
  - Files: `src/hooks/useCreateListing.ts`

---

- [ ] 5. Create useCancelListing Hook

  **What to do**:
  - Create `src/hooks/useCancelListing.ts`
  - Use OpenSea SDK's offchain cancel method
  - Accept orderHash and contestId parameters
  - Handle signature requirement for cancellation
  - **On success: Invalidate both Redis and React Query caches** using `invalidateListingsCache(contestId, queryClient)`
  - Call `/api/opensea/listings/{contestId}/refresh` to clear Redis cache
  - Return mutation with loading, error, success states

  **Must NOT do**:
  - Do not require onchain cancellation (offchain is sufficient for OpenSea)
  - Do not forget to invalidate cache on success

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple mutation hook
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/hooks/useProcessPayouts.ts:1-50` - Simple mutation hook pattern

  **External References**:
  - OpenSea SDK cancel: `sdk.api.offchainCancelOrder(protocolAddress, orderHash, chain)`

  **Acceptance Criteria**:

  ```bash
  # Verify hook file exists
  grep "export function useCancelListing" src/hooks/useCancelListing.ts
  # Expected: export function useCancelListing

  # Verify useMutation usage
  grep "useMutation" src/hooks/useCancelListing.ts
  # Expected: useMutation

  # Verify cache invalidation
  grep -i "invalidate\|refresh" src/hooks/useCancelListing.ts
  # Expected: cache invalidation code

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add useCancelListing hook with cache invalidation`
  - Files: `src/hooks/useCancelListing.ts`

---

- [ ] 6. Create useFulfillOrder Hook

  **What to do**:
  - Create `src/hooks/useFulfillOrder.ts`
  - Use OpenSea SDK to fulfill/buy listings
  - Accept listing object, buyer address, and contestId
  - Handle ERC20 approval for USDC payments
  - Execute transaction via SDK
  - **On success: Invalidate multiple caches**:
    - Redis listings cache via `/api/opensea/listings/{contestId}/refresh`
    - React Query listings cache via `queryClient.invalidateQueries`
    - Contest cache (box owners changed) via `invalidateContestCaches(contestId, queryClient)`
  - Return mutation with loading, error, success states

  **Must NOT do**:
  - Do not skip approval check for USDC
  - Do not handle partial fills (quantity always 1 for ERC721)
  - Do not forget to invalidate both listings AND contest caches (ownership changed)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Mutation with approval flow
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/hooks/useClaimBoxes.ts:1-100` - Approval flow pattern for ERC20

  **External References**:
  - OpenSea SDK fulfill: `sdk.fulfillOrder({ order, accountAddress })`

  **Acceptance Criteria**:

  ```bash
  # Verify hook file exists
  grep "export function useFulfillOrder" src/hooks/useFulfillOrder.ts
  # Expected: export function useFulfillOrder

  # Verify approval handling for USDC
  grep -i "approv" src/hooks/useFulfillOrder.ts
  # Expected: approval-related code

  # Verify cache invalidation for listings
  grep -i "listings.*invalidate\|listings.*refresh" src/hooks/useFulfillOrder.ts
  # Expected: listings cache invalidation

  # Verify contest cache invalidation (ownership changed)
  grep -i "invalidateContestCaches\|contest.*refresh" src/hooks/useFulfillOrder.ts
  # Expected: contest cache invalidation

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add useFulfillOrder hook with USDC approval and cache invalidation`
  - Files: `src/hooks/useFulfillOrder.ts`

---

- [ ] 7. Create SellBoxForm Component

  **What to do**:
  - Create `src/components/contest/SellBoxForm.tsx`
  - Price input field with number validation
  - Currency dropdown: ETH / USDC (use Select from shadcn)
  - USD equivalent display using `useTokenPricing`
  - Duration selector: 1 day, 3 days, 7 days, 1 month
  - Optional "Reserve for address" input (collapsible/expandable)
  - Submit button calling `useCreateListing`
  - Cancel listing button (if already listed) calling `useCancelListing`
  - Loading states during transaction
  - Success/error toast notifications
  - Proper form validation

  **Must NOT do**:
  - Do not support currencies beyond ETH/USDC
  - Do not allow 0 or negative prices
  - Do not show form to non-owners (handled by parent)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UI with validation and user feedback
  - **Skills**: `["frontend-ui-ux"]`
    - frontend-ui-ux: Form design with proper UX patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - `src/components/contest/CreateContestForm.tsx:1-200` - Form with USD display pattern
  - `src/components/pickem/CreatePickemForm.tsx:100-130` - USD estimation calculation
  - `src/components/ui/select.tsx` - Select component usage
  - `src/components/ui/input.tsx` - Input component usage
  - `src/components/ui/button.tsx` - Button with loading state

  **API/Type References**:
  - `src/hooks/useTokenPricing.ts` - USD price hook
  - `src/hooks/useCreateListing.ts` - Create listing mutation (Task 4)
  - `src/hooks/useCancelListing.ts` - Cancel listing mutation (Task 5)

  **Acceptance Criteria**:

  ```bash
  # Verify component file exists
  grep "export function SellBoxForm\|export default function SellBoxForm" src/components/contest/SellBoxForm.tsx
  # Expected: export statement found

  # Verify USD display
  grep -i "usd\|pricing" src/components/contest/SellBoxForm.tsx
  # Expected: USD-related code

  # Verify currency selection
  grep -i "eth\|usdc" src/components/contest/SellBoxForm.tsx
  # Expected: currency options

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Playwright Verification**:

  ```
  1. Navigate to contest page with owned box
  2. Click on owned box to open modal
  3. Assert: SellBoxForm is visible below box info
  4. Fill price input with "0.1"
  5. Select "ETH" from currency dropdown
  6. Assert: USD equivalent appears (e.g., "≈ $XXX.XX USD")
  7. Screenshot: .sisyphus/evidence/task-7-sell-form.png
  ```

  **Commit**: YES
  - Message: `feat(opensea): add SellBoxForm component with USD display`
  - Files: `src/components/contest/SellBoxForm.tsx`

---

- [ ] 8. Create BuyBoxSection Component

  **What to do**:
  - Create `src/components/contest/BuyBoxSection.tsx`
  - Display listing price with currency symbol
  - Show USD equivalent using `useTokenPricing`
  - "Buy Now" button calling `useFulfillOrder`
  - Show seller info (address/profile)
  - For private listings, check if viewer is reserved buyer
  - Handle insufficient balance error gracefully
  - Loading state during purchase transaction
  - Success toast with link to transaction

  **Must NOT do**:
  - Do not show buy section for box owner
  - Do not show buy button for private listings if viewer isn't the reserved buyer

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Purchase UI with clear price display
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `src/components/contest/ContestStats.tsx:46-67` - USD formatting pattern
  - `src/components/contest/UserProfileModal.tsx:300-400` - Modal section layout

  **API/Type References**:
  - `src/hooks/useFulfillOrder.ts` - Buy mutation (Task 6)
  - `src/components/contest/types.ts:OpenSeaListing` - Listing type

  **Acceptance Criteria**:

  ```bash
  # Verify component file exists
  grep "export function BuyBoxSection\|export default function BuyBoxSection" src/components/contest/BuyBoxSection.tsx
  # Expected: export statement found

  # Verify price display
  grep -i "price" src/components/contest/BuyBoxSection.tsx
  # Expected: price display code

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Commit**: YES
  - Message: `feat(opensea): add BuyBoxSection component`
  - Files: `src/components/contest/BuyBoxSection.tsx`

---

- [ ] 9. Add "For Sale" Styling to FootballGrid

  **What to do**:
  - Modify `src/components/contest/FootballGrid.tsx`
  - Accept `listings` prop (Map from useBoxListings)
  - Add `isForSale` check for each box using listings map
  - Add amber ring styling: `ring-2 ring-amber-400/80` for listed boxes
  - Add "For Sale" badge: `bg-amber-500 text-white` positioned like "You" badge
  - When box is both owned by user AND for sale, show "For Sale" only (takes priority)
  - Ensure proper dark mode support for amber colors

  **Must NOT do**:
  - Do not show "You" badge when box is for sale (For Sale takes priority)
  - Do not change existing winner or selection styling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Grid styling with state-based CSS
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `src/components/contest/FootballGrid.tsx:364-367` - isMyBox ownership check
  - `src/components/contest/FootballGrid.tsx:389` - ring styling for owned boxes
  - `src/components/contest/FootballGrid.tsx:399-402` - "You" badge implementation

  **Styling References**:
  - Amber ring: `ring-2 ring-amber-400/80` (matches sky-400/80 pattern)
  - Amber badge: `bg-amber-500` with same text styling as "You" badge

  **Acceptance Criteria**:

  ```bash
  # Verify listings prop added
  grep "listings" src/components/contest/FootballGrid.tsx | head -5
  # Expected: listings prop in component signature

  # Verify amber styling
  grep "amber" src/components/contest/FootballGrid.tsx
  # Expected: ring-amber and bg-amber classes

  # Verify "For Sale" text
  grep "For Sale" src/components/contest/FootballGrid.tsx
  # Expected: "For Sale" badge text

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Playwright Verification**:

  ```
  1. Navigate to contest with listed box (or mock one)
  2. Assert: Listed box has amber/orange border
  3. Assert: "For Sale" badge visible on listed box
  4. Screenshot: .sisyphus/evidence/task-9-for-sale-grid.png
  ```

  **Commit**: YES
  - Message: `feat(opensea): add "For Sale" styling to FootballGrid`
  - Files: `src/components/contest/FootballGrid.tsx`

---

- [ ] 10. Integrate Everything into UserProfileModal

  **What to do**:
  - Modify `src/components/contest/UserProfileModal.tsx`
  - Import and use `useBoxListings` to get listing for current box
  - Add `SellBoxForm` inline below box info section (only for owner)
  - Add `BuyBoxSection` inline below box info (for non-owners when box is listed)
  - Remove old "Sell Box" external link button
  - Pass listing data to child components
  - Handle loading states while fetching listing status
  - Update parent page to pass listings data to FootballGrid

  **Must NOT do**:
  - Do not show both SellBoxForm and BuyBoxSection simultaneously
  - Do not show any marketplace UI for unclaimed boxes
  - Do not break existing modal functionality (winnings, profile, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Modal integration with conditional rendering
  - **Skills**: `["frontend-ui-ux"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 7, 8, 9

  **References**:

  **Pattern References**:
  - `src/components/contest/UserProfileModal.tsx:364-376` - Current ownership check and sell button
  - `src/components/contest/UserProfileModal.tsx:437-445` - Current sell button rendering location
  - `src/app/contest/[contestId]/page.tsx:80-95` - Modal state management in parent

  **Component References**:
  - `src/components/contest/SellBoxForm.tsx` - Sell form (Task 7)
  - `src/components/contest/BuyBoxSection.tsx` - Buy section (Task 8)
  - `src/hooks/useBoxListings.ts` - Listings hook (Task 2)

  **Acceptance Criteria**:

  ```bash
  # Verify old sell button removed
  grep "Sell Box" src/components/contest/UserProfileModal.tsx
  # Expected: Only in new SellBoxForm context, not as Link

  # Verify SellBoxForm imported
  grep "SellBoxForm" src/components/contest/UserProfileModal.tsx
  # Expected: import statement found

  # Verify BuyBoxSection imported
  grep "BuyBoxSection" src/components/contest/UserProfileModal.tsx
  # Expected: import statement found

  # Verify build succeeds
  bun run build
  # Expected: Build completes without errors
  ```

  **Playwright Verification**:

  ```
  # Test owner view
  1. Connect wallet that owns a box
  2. Navigate to contest page
  3. Click on owned box
  4. Assert: Modal opens with SellBoxForm visible below box info
  5. Assert: BuyBoxSection is NOT visible
  6. Screenshot: .sisyphus/evidence/task-10-owner-modal.png

  # Test non-owner view of listed box
  7. Click on a listed box (not owned)
  8. Assert: BuyBoxSection visible with price
  9. Assert: SellBoxForm is NOT visible
  10. Screenshot: .sisyphus/evidence/task-10-buyer-modal.png
  ```

  **Commit**: YES
  - Message: `feat(opensea): integrate marketplace UI into UserProfileModal`
  - Files: `src/components/contest/UserProfileModal.tsx`, `src/app/contest/[contestId]/page.tsx`

---

## Commit Strategy

| After Task | Message                                                        | Files                                 | Verification  |
| ---------- | -------------------------------------------------------------- | ------------------------------------- | ------------- |
| 1          | `feat(opensea): add SDK infrastructure and listings API route` | package.json, hooks, api route, types | bun run build |
| 2          | `feat(opensea): add useBoxListings hook`                       | hook file, query-keys                 | bun run build |
| 4          | `feat(opensea): add useCreateListing hook`                     | hook file                             | bun run build |
| 5          | `feat(opensea): add useCancelListing hook`                     | hook file                             | bun run build |
| 6          | `feat(opensea): add useFulfillOrder hook`                      | hook file                             | bun run build |
| 7          | `feat(opensea): add SellBoxForm component`                     | component file                        | bun run build |
| 8          | `feat(opensea): add BuyBoxSection component`                   | component file                        | bun run build |
| 9          | `feat(opensea): add "For Sale" styling to grid`                | FootballGrid.tsx                      | bun run build |
| 10         | `feat(opensea): integrate marketplace UI into modal`           | modal, page files                     | bun run build |

---

## Success Criteria

### Verification Commands

```bash
# Build succeeds
bun run build

# All new files exist
ls src/hooks/useOpenSeaSDK.ts
ls src/hooks/useBoxListings.ts
ls src/hooks/useCreateListing.ts
ls src/hooks/useCancelListing.ts
ls src/hooks/useFulfillOrder.ts
ls src/components/contest/SellBoxForm.tsx
ls src/components/contest/BuyBoxSection.tsx
ls src/app/api/opensea/listings/\[contestId\]/route.ts
ls src/app/api/opensea/listings/\[contestId\]/refresh/route.ts

# Verify caching infrastructure
grep "getListingsCacheKey" src/lib/redis.ts
grep "OPENSEA_LISTINGS" src/lib/redis.ts
grep "invalidateListingsCache" src/lib/cache-utils.ts
grep "boxListings" src/lib/query-keys.ts
```

### Final Checklist

- [ ] Build passes without errors
- [ ] Owner can list box for sale with ETH or USDC
- [ ] Owner sees USD equivalent while setting price
- [ ] Owner can create private listing for specific address
- [ ] Owner can cancel their listing
- [ ] Non-owner can buy listed box
- [ ] Grid shows amber "For Sale" indicator on listed boxes
- [ ] "For Sale" styling takes priority over "You" styling
- [ ] All error states handled gracefully
- [ ] Loading states shown during transactions
- [ ] **Redis caching works** - Second page load is faster (cache hit)
- [ ] **Cache invalidation works** - After listing/cancel/buy, fresh data appears on next load

### Caching Verification

```bash
# Verify Redis cache key helper exists
grep "getListingsCacheKey" src/lib/redis.ts
# Expected: export const getListingsCacheKey

# Verify cache TTL exists
grep "OPENSEA_LISTINGS" src/lib/redis.ts
# Expected: OPENSEA_LISTINGS: 300

# Verify API route uses Redis
grep "redis" src/app/api/opensea/listings/\[contestId\]/route.ts
# Expected: redis.get/redis.setex calls

# Verify refresh route exists
ls src/app/api/opensea/listings/\[contestId\]/refresh/route.ts
# Expected: file exists

# Verify mutation hooks invalidate cache
grep "refresh" src/hooks/useCreateListing.ts
grep "refresh" src/hooks/useCancelListing.ts
grep "refresh" src/hooks/useFulfillOrder.ts
# Expected: /refresh endpoint calls in all three
```
