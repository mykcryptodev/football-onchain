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
  [base.id]: "0x58500b8479a5a156710471acb246d2efee54d52a",
};

export const contestsManager = {
  [baseSepolia.id]: "0x0c2f20bca82682c753E009603743eA3046A70463",
  [base.id]: "0x01fefc63af825e9ec1d57134b828e15c6a55c4e8",
};

export const boxes = {
  [baseSepolia.id]: "0x981227a1B8d967a8812a1aD10B9AF64791B051D3",
  [base.id]: "0x1a79b628151556299f1314b650058de6974f47e5",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0xFf8D5B025fC0061Ba41bFfcD1A9049F066B91Fe6",
  [base.id]: "0x1887c12f33096015316032d640195a7cd7d449cd",
};

export const scoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0x53d14af6c0717e7939aa702a0697a94db5f877c3",
};

export const quartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xfd40868b115745fa435df2b7d9026881455b801f",
};

export const randomNumbers = {
  [baseSepolia.id]: "0x951BbC0e36b0838f2B87f6a0feDe8F421CDaD7eA",
  [base.id]: "0xfa236700a54f4b14f8f9f7fda5ffa5903f961e80",
};

export const pickemNFT = {
  [baseSepolia.id]: "0x676d9b3a41654191789b097640011734491544b7",
  [base.id]: "0x4a4f5e5a308895e18c7437a08093b78ca3f8f102",
};

export const pickem = {
  [baseSepolia.id]: "0x0174888171951518908830462666580944b05308",
  [base.id]: "0xa66108b44aca9eb95c8ba48b607bdb9d92a0879d",
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
