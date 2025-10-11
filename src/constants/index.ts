import { Hex } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

// APP INFO
export const appName = "Football";
export const appDescription =
  "Play Super Bowl Square and Pick em with your friends for any NFL game!";

// CHAINS
export const chain = base;

// ADDRESSES
export const contests = {
  [baseSepolia.id]: "0x2de23490da5A155abEBCe591504a651C12475F96",
  [base.id]: "0xda298c303b6d01f261da8fd3fe073e4c009d95a9",
};

export const contestsManager = {
  [baseSepolia.id]: "0x0c2f20bca82682c753E009603743eA3046A70463",
  [base.id]: "0xafdea0c63f50ae31f23c2bb771c4836681fceafe",
};

export const boxes = {
  [baseSepolia.id]: "0x981227a1B8d967a8812a1aD10B9AF64791B051D3",
  [base.id]: "0xce101fda1cb9737a0bef4a97d787943833c040ea",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0xFf8D5B025fC0061Ba41bFfcD1A9049F066B91Fe6",
  [base.id]: "0xd6064348cecd383793c13140aa5e3977a3edfdaf",
};

export const scoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0xff85715d24bea9c898ba537bad9c2eb8270fed80",
};

export const quartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xe1a29d62c6072555ac1da7134b27d568b7146842",
};

export const randomNumbers = {
  [baseSepolia.id]: "0x951BbC0e36b0838f2B87f6a0feDe8F421CDaD7eA",
  [base.id]: "0xd8a310ab31d866638df2b7994c669440a865b835",
};

export const pickemNFT = {
  [baseSepolia.id]: "0x676d9b3a41654191789b097640011734491544b7",
  [base.id]: "0x9235f548aff089e6653f6f9765e5df1149b2bfc9",
};

export const pickem = {
  [baseSepolia.id]: "0x0174888171951518908830462666580944b05308",
  [base.id]: "0xc1f12603a1c90a22de4cdd702cbe7993c2ec03a1",
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
