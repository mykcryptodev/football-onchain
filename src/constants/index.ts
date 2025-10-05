import { Hex } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

// APP INFO
export const appName = "Football Boxes";
export const appDescription =
  "Play Super Bowl Squares with your friends for any NFL game!";

// CHAINS
export const chain = base;

// ADDRESSES
export const contests = {
  [baseSepolia.id]: "0x2de23490da5A155abEBCe591504a651C12475F96",
  [base.id]: "0xa20fd1aa6a6cf6ee7cb8607f1e697f4515e1ab15",
};

export const contestsManager = {
  [baseSepolia.id]: "0x0c2f20bca82682c753E009603743eA3046A70463",
  [base.id]: "0x3e0556a57e30b2db9c611a0dedab367245dd3823",
};

export const boxes = {
  [baseSepolia.id]: "0x981227a1B8d967a8812a1aD10B9AF64791B051D3",
  [base.id]: "0xeef4e7f48d01118b208f4f26b5189598bff38861",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0xFf8D5B025fC0061Ba41bFfcD1A9049F066B91Fe6",
  [base.id]: "0xad04172ef81f05095f677b9dd4cb3b58d2ac6d8e",
};

export const scoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0x01a5629371a545ca85727ffc379dba885a7738c1",
};

export const quartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xfd9e403e61b80e5a9fe2a35a485fcc3e4295ceaf",
};

export const randomNumbers = {
  [baseSepolia.id]: "0x951BbC0e36b0838f2B87f6a0feDe8F421CDaD7eA",
  [base.id]: "0x29ad0e262e5d131d9ad07eb363cbcc5a729d0f28",
};

export const usdc = {
  [baseSepolia.id]: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

export const multicall = {
  [baseSepolia.id]: "0xcA11bde05977b3631167028862bE2a173976CA11",
  [base.id]: "0xca11bde05977b3631167028862be2a173976ca11",
};

export const chainlinkSubscriptionId: Record<number, bigint> = {
  [baseSepolia.id]: BigInt(208),
  [base.id]: BigInt(6),
};

export const chainlinkJobId: Record<number, Hex> = {
  [base.id]:
    "0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000",
  [baseSepolia.id]:
    "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000",
};

export const chainlinkGasLimit: Record<number, bigint> = {
  [base.id]: BigInt(300000),
  [baseSepolia.id]: BigInt(1000000),
};
