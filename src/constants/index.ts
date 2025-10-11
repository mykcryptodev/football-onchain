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
  [base.id]: "0x4c1457c18670a6392e78453d815de67bd098ce80",
};

export const contestsManager = {
  [baseSepolia.id]: "0x0c2f20bca82682c753E009603743eA3046A70463",
  [base.id]: "0xbefb88cc6bd5096e34ad339668b68c3a96d5bc35",
};

export const boxes = {
  [baseSepolia.id]: "0x981227a1B8d967a8812a1aD10B9AF64791B051D3",
  [base.id]: "0x8065e0284fe4f0e7adf3de39d3ce2fc68198be58",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0xFf8D5B025fC0061Ba41bFfcD1A9049F066B91Fe6",
  [base.id]: "0x01c21d312b948fc6d931286bf76ba3df28ea4306",
};

export const scoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0x8a9ec11d8a07d43f41f56595c68948e95d855840",
};

export const quartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xb6053cf5c1f4528842fa4be2db2baeb4da1d14c1",
};

export const randomNumbers = {
  [baseSepolia.id]: "0x951BbC0e36b0838f2B87f6a0feDe8F421CDaD7eA",
  [base.id]: "0x0081251c796a6054a15ee049e17473aef6d4e592",
};

export const pickemNFT = {
  [baseSepolia.id]: "0x676d9b3a41654191789b097640011734491544b7",
  [base.id]: "0xcab760b1eaf0f566c791b1c635986a1c6c5485aa",
};

export const pickem = {
  [baseSepolia.id]: "0x0174888171951518908830462666580944b05308",
  [base.id]: "0xa2f5b0ee40888d8c9e7085b20dcda9646d1fff57",
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
