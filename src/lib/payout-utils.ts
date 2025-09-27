import { PayoutStrategyType } from "@/components/contest/types";
import {
  chain,
  quartersOnlyPayoutStrategy,
  scoreChangesPayoutStrategy,
} from "@/constants";

/**
 * Determine the payout strategy type based on the contract address
 */
export function getPayoutStrategyType(
  payoutStrategyAddress: string,
): PayoutStrategyType {
  const quartersOnlyAddress =
    quartersOnlyPayoutStrategy[chain.id]?.toLowerCase();
  const scoreChangesAddress =
    scoreChangesPayoutStrategy[chain.id]?.toLowerCase();
  const addressToCheck = payoutStrategyAddress.toLowerCase();

  if (addressToCheck === quartersOnlyAddress) {
    return "quarters-only";
  } else if (addressToCheck === scoreChangesAddress) {
    return "score-changes";
  } else {
    throw new Error("Invalid payout strategy address");
  }
}

/**
 * Get payout breakdown for quarters-only strategy
 */
export function getQuartersOnlyPayouts(totalRewards: number) {
  return {
    q1: { percentage: 15, amount: totalRewards * 0.15, label: "Q1 (15%)" },
    q2: { percentage: 20, amount: totalRewards * 0.2, label: "Q2 (20%)" },
    q3: { percentage: 15, amount: totalRewards * 0.15, label: "Q3 (15%)" },
    q4: { percentage: 50, amount: totalRewards * 0.5, label: "Final (50%)" },
  };
}

/**
 * Get payout breakdown for score changes + quarters strategy
 */
export function getScoreChangesPayouts(
  totalRewards: number,
  scoreChangeCount: number = 0,
) {
  const scoreChangesAllocation = totalRewards * 0.5; // 50% for score changes
  const quartersAllocation = totalRewards * 0.5; // 50% for quarters

  return {
    scoreChanges: {
      totalAllocation: scoreChangesAllocation,
      perScoreChange:
        scoreChangeCount > 0 ? scoreChangesAllocation / scoreChangeCount : 0,
      count: scoreChangeCount,
      label: "Score Changes (50%)",
    },
    quarters: {
      q1: {
        percentage: 7.5,
        amount: quartersAllocation * 0.15,
        label: "Q1 (7.5%)",
      },
      q2: {
        percentage: 10,
        amount: quartersAllocation * 0.2,
        label: "Q2 (10%)",
      },
      q3: {
        percentage: 7.5,
        amount: quartersAllocation * 0.15,
        label: "Q3 (7.5%)",
      },
      q4: {
        percentage: 25,
        amount: quartersAllocation * 0.5,
        label: "Final (25%)",
      },
    },
  };
}

/**
 * Format wei amount to readable string
 */
export function formatEther(wei: number, decimals: number = 4): string {
  return (wei / 1e18).toFixed(decimals);
}

/**
 * Get strategy display name
 */
export function getStrategyDisplayName(
  strategyType: PayoutStrategyType,
): string {
  switch (strategyType) {
    case "quarters-only":
      return "Quarters Only";
    case "score-changes":
      return "Score Changes + Quarters";
    default:
      return "Unknown Strategy";
  }
}

/**
 * Get strategy description
 */
export function getStrategyDescription(
  strategyType: PayoutStrategyType,
): string {
  switch (strategyType) {
    case "quarters-only":
      return "Payouts are made at the end of each quarter. Winners can claim immediately.";
    case "score-changes":
      return "Payouts for score changes and quarters. All payouts are made only after the game is completely finished.";
    default:
      return "";
  }
}
