import { Hex } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

// APP INFO
export const appName = "Squares";
export const appDescription =
  "Play Super Bowl Square and Pick em with your friends for any NFL game!";

// CHAINS
export const chain = base;

// ADDRESSES
export const contests = {
  [baseSepolia.id]: "0x2de23490da5A155abEBCe591504a651C12475F96",
  [base.id]: "0x55d8F49307192e501d9813fC4d116a79f66cffae",
};

export const contestsManager = {
  [baseSepolia.id]: "0x0c2f20bca82682c753E009603743eA3046A70463",
  [base.id]: "0xe258EB3658935716D4Ad363EcBae48Da64eB1BFc",
};

export const boxes = {
  [baseSepolia.id]: "0x981227a1B8d967a8812a1aD10B9AF64791B051D3",
  [base.id]: "0x7b02f27E6946b77F046468661bF0770C910d72Ef",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0xFf8D5B025fC0061Ba41bFfcD1A9049F066B91Fe6",
  [base.id]: "0x03C36C1a2c954B3FdA9D767213BA812577cB5878",
};

export const scoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0x1233906b843F2a127944D7acE98F1286F1883CDF",
};

export const quartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xdc7dd804d00e914e49d91ac68fd6d1ff0c1481d8",
};

export const legacyScoreChangesPayoutStrategy = {
  [baseSepolia.id]: "0xf69F876BBB478AD28C94a3E7b449230Fd88F56cB",
  [base.id]: "0xfcECAF769AE37660c7178C38fd6c49868e90FA89",
};

export const legacyQuartersOnlyPayoutStrategy = {
  [baseSepolia.id]: "0xD768a2440924Bd16b950583966b0CBc92f19845d",
  [base.id]: "0xE162C6CC5E8440132Ca85740740aAcEaf9baFcD2",
};

export const randomNumbers = {
  [baseSepolia.id]: "0x951BbC0e36b0838f2B87f6a0feDe8F421CDaD7eA",
  [base.id]: "0xcd096C9A439959B87D454d180B98f1b9Bf9C7Ea5",
};

export const pickemNFT = {
  [baseSepolia.id]: "0x676d9b3a41654191789b097640011734491544b7",
  [base.id]: "0x524441f074F453681ac6e7F1d6DFe1Cd6CE1b934",
};

export const pickem = {
  [baseSepolia.id]: "0x0174888171951518908830462666580944b05308",
  [base.id]: "0xD2BB06162f80CC377b55eC531a59a6a62301E09C",
};

export const airdrop = {
  [baseSepolia.id]: "0xaBA25A201074B70f359D7B0c58B6B9e157c5bEB5",
  [base.id]: "0xaBA25A201074B70f359D7B0c58B6B9e157c5bEB5",
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

export const featuredContestIds: number[] = [];
