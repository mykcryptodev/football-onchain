import { base, baseSepolia } from "thirdweb/chains";

// APP INFO
export const appName = "Football Boxes";

// CHAINS
export const chain = baseSepolia;

// ADDRESSES
export const contests = {
  [baseSepolia.id]: "0x14e0e6570f659c7993ad64041e6904136a97ac78",
  [base.id]: "",
};

export const boxes = {
  [baseSepolia.id]: "0xa6245242c9c985a1a272a39aa5d434c90bf0e2dd",
  [base.id]: "",
};

export const gameScoreOracle = {
  [baseSepolia.id]: "0x1f033d0948644296f7c775bff98fe4cc667d505b",
  [base.id]: "",
};

export const usdc = {
  [baseSepolia.id]: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};
