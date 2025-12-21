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
  payoutTransactionHash?: string | null; // Transaction hash of the payout transaction
}

export interface PayoutInfo {
  winner: string;
  amount: number;
  reason: string;
  quarter: number;
  eventIndex: number;
}

export enum PayoutStrategyType {
  QUARTERS_ONLY = "quarters-only",
  SCORE_CHANGES = "score-changes",
}

export interface ScoringPlay {
  id: string;
  type: {
    id: string;
    text: string;
    abbreviation: string;
  };
  text: string;
  awayScore: number;
  homeScore: number;
  period: {
    number: number;
  };
  clock: {
    value: number;
    displayValue: string;
  };
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
  scoringType: {
    name: string;
    displayName: string;
    abbreviation: string;
  };
}

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
  scoringPlays?: ScoringPlay[];
}

export interface BoxOwner {
  tokenId: number;
  owner: string;
  row: number;
  col: number;
}
