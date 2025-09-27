// Shared types for contest components
export interface Contest {
  id: number;
  gameId: number;
  creator: string;
  rows: number[];
  cols: number[];
  boxCost: {
    currency: string;
    amount: number;
  };
  boxesCanBeClaimed: boolean;
  payoutsPaid: {
    totalPayoutsMade: number;
    totalAmountPaid: number;
  };
  totalRewards: number;
  boxesClaimed: number;
  randomValuesSet: boolean;
  title: string;
  description: string;
  payoutStrategy: string; // Address of the payout strategy contract
}

export interface PayoutInfo {
  winner: string;
  amount: number;
  reason: string;
  quarter: number;
  eventIndex: number;
}

export type PayoutStrategyType = "quarters-only" | "score-changes";

export interface GameScore {
  id: number;
  homeQ1LastDigit: number;
  homeQ2LastDigit: number;
  homeQ3LastDigit: number;
  homeFLastDigit: number;
  awayQ1LastDigit: number;
  awayQ2LastDigit: number;
  awayQ3LastDigit: number;
  awayFLastDigit: number;
  qComplete: number;
  requestInProgress: boolean;
}

export interface BoxOwner {
  tokenId: number;
  owner: string;
  row: number;
  col: number;
}
