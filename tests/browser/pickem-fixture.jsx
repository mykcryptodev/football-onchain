// Browser-only fixture: real contest UI, draft hook, Button, Radix dialog and
// Farcaster SDK. Replace remote reads/submission at their hook boundaries.
import { sdk } from "@farcaster/miniapp-sdk";
import React from "react";
import { createRoot } from "react-dom/client";

import PickemContestClient from "../../src/app/pickem/[id]/PickemContestClient";
import { Button } from "../../src/components/ui/button";

const params = new URLSearchParams(location.search);
if (params.has("nativeHaptic")) {
  sdk.getCapabilities = async () => ["haptics.impactOccurred"];
  sdk.haptics.impactOccurred = () =>
    params.get("nativeHaptic") === "reject"
      ? Promise.reject(new Error("Unsupported feedback"))
      : new Promise(() => {});
}
const gameIds = ["101", "102", "103", "104"];
export const games = gameIds.map((gameId, index) => ({
  gameId,
  kickoff: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
  homeTeam: `Home ${gameId}`,
  awayTeam: `Away ${gameId}`,
  homeAbbreviation: `H${gameId}`,
  awayAbbreviation: `A${gameId}`,
  homeRecord: "1-0",
  awayRecord: "0-1",
}));
export const useActiveAccount = () =>
  params.has("guest")
    ? undefined
    : { address: "0x1111111111111111111111111111111111111111" };
export const useWalletBalance = () => ({
  data: { value: params.has("poor") ? 0n : 10000000n, displayValue: "10" },
  isLoading: params.has("balanceLoading"),
  isError: params.has("balanceError"),
  refetch() {},
});
export const useReadContract = () => ({ data: 6 });
export const useWeekGames = () => ({
  games: params.has("missingGame") ? games.slice(1) : games,
  isLoading: params.has("gamesLoading"),
  error: params.has("gamesError") ? new Error("offline") : null,
});
export const useOwnedPickemEntries = () => ({
  data: [],
  isLoading: false,
  isError: false,
});
export const useTheme = () => ({ resolvedTheme: "light" });
export const useQueryClient = () => ({ invalidateQueries() {} });
export const useRouter = () => ({ push() {} });
export const useDisplayToken = () => ({
  setTokenAddress: React.useCallback(() => {}, []),
});
export const useFormattedCurrency = () => ({ formattedValue: "1 USDC" });
export const useBalanceRefresh = () => ({ start() {} });
export const useFarcasterContext = () => ({ isInMiniApp: false });
export const client = {};
export const getContract = () => ({});
export const toTokens = () => "1";
export const darkTheme = () => ({});
export const lightTheme = () => ({});
export const ConnectButton = () => <button>Log in to submit picks</button>;
export const BuyWidget = () => <div>Buy widget fixture</div>;
export const usePickemContract = () => ({
  submitPredictions: async () => {
    window.submitAttempts = (window.submitAttempts || 0) + 1;
    if (params.has("holdSubmission")) return new Promise(() => {});
    // This is a local EIP-1193 stub, not a network/wallet transaction.
    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [],
    });
  },
  confirmEntry: async () => {
    throw new Error("Unexpected confirmation");
  },
});
export default function Empty({ children }) {
  return children ?? null;
}

if (!window.fixtureMounted) {
  window.fixtureMounted = true;
  createRoot(document.getElementById("root")).render(
    <>
      <nav className="sticky top-0 z-40 bg-background" style={{ height: 128 }}>
        Navigation fixture
      </nav>
      <PickemContestClient
        contest={{
          id: 99,
          creator: "0x1111111111111111111111111111111111111111",
          seasonType: 2,
          weekNumber: 2,
          year: 2026,
          entryFee: 1000000n,
          currency: "0x2222222222222222222222222222222222222222",
          totalPrizePool: 0n,
          totalEntries: 0,
          submissionDeadline:
            Date.now() + (params.has("closed") ? -1 : 3600000),
          gamesFinalized: false,
          payoutType: 0,
          gameIds,
          tiebreakerGameId: "104",
        }}
      />
      <div style={{ paddingBottom: 160 }}>
        <Button
          id="sync-handler"
          onClick={event => {
            window.syncCurrentTarget = event.currentTarget?.id;
            event.preventDefault();
          }}
        >
          Synchronous handler probe
        </Button>
      </div>
    </>,
  );
}
