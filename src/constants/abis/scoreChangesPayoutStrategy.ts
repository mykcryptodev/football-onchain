export const abi = [
  {
    type: "function",
    name: "BASIS_POINTS_DENOMINATOR",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "Q1_QUARTER_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "Q2_QUARTER_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "Q3_QUARTER_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "Q4_QUARTER_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "QUARTERS_ALLOCATION_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "SCORE_CHANGES_ALLOCATION_BPS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculatePayouts",
    inputs: [
      {
        name: "contestId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "gameId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalPot",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "gameScoreOracle",
        type: "address",
        internalType: "contract GameScoreOracle",
      },
      {
        name: "getBoxOwner",
        type: "function",
        internalType:
          "function (uint256,uint256,uint256) view external returns (address)",
      },
    ],
    outputs: [
      {
        name: "payouts",
        type: "tuple[]",
        internalType: "struct IPayoutStrategy.PayoutInfo[]",
        components: [
          {
            name: "winner",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "reason",
            type: "string",
            internalType: "string",
          },
          {
            name: "quarter",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "eventIndex",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllocationPercentages",
    inputs: [],
    outputs: [
      {
        name: "scoreChangesAllocation",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "quartersAllocation",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getQuarterPayoutBps",
    inputs: [
      {
        name: "quarter",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    outputs: [
      {
        name: "bps",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getStrategyName",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getStrategyType",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "requiresScoreChanges",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "validateGameState",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "gameScoreOracle",
        type: "address",
        internalType: "contract GameScoreOracle",
      },
    ],
    outputs: [
      {
        name: "isValid",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "reason",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
];
