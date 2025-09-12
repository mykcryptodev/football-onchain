import { base, baseSepolia } from "thirdweb/chains";

// APP INFO
export const appName = "Football Boxes";

// CHAINS
export const chain = base;

// ADDRESSES
export const contests = {
  [baseSepolia.id]: "0x3d37f6d4ee1ec2de1e3626e1e560c4ca8ba549f5",
  [base.id]: "",
};

export const contestsManager = {
  [baseSepolia.id]: "0xcce429ba37078f628d803ae67b90883f5131dd03",
  [base.id]: "",
};

export const boxes = {
  [baseSepolia.id]: "0x1f9baafc9e9a93dd21740cb53d1b0ba7e9b06732",
  [base.id]: "",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0x1337b2ff21ea70cf4603c9cccc8e8ab150083153",
  [base.id]: "",
};

export const usdc = {
  [baseSepolia.id]: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};
