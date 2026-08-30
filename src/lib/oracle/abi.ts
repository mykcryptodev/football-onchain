/**
 * ABI for CREScoreOracle (with reporter role), generated from the compiled
 * contract artifact. Regenerate after contract changes:
 *   forge build && jq .abi forge-artifacts/CREScoreOracle.sol/CREScoreOracle.json
 */
export const CRE_ORACLE_ABI = [
  {
    "type": "function",
    "name": "areScoreChangesAvailable",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "calculateWeekId",
    "inputs": [
      {
        "name": "year",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "seasonType",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "weekNumber",
        "type": "uint8",
        "internalType": "uint8",
      },
    ],
    "outputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "stateMutability": "pure",
  },
  {
    "type": "function",
    "name": "forwarder",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "gameScoreChanges",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "packedScoreChanges",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "gameScores",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "qComplete",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "requestInProgress",
        "type": "bool",
        "internalType": "bool",
      },
      {
        "name": "gameCompleted",
        "type": "bool",
        "internalType": "bool",
      },
      {
        "name": "packedQuarterScores",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "packedQuarterDigits",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "totalScoreChanges",
        "type": "uint8",
        "internalType": "uint8",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "getGameScores",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "homeQ1LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "homeQ2LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "homeQ3LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "homeFLastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "awayQ1LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "awayQ2LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "awayQ3LastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "awayFLastDigit",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "qComplete",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "requestInProgress",
        "type": "bool",
        "internalType": "bool",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "onReport",
    "inputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes",
      },
      {
        "name": "report",
        "type": "bytes",
        "internalType": "bytes",
      },
    ],
    "outputs": [],
    "stateMutability": "nonpayable",
  },
  {
    "type": "function",
    "name": "reporter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "getWeekGames",
    "inputs": [
      {
        "name": "year",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "seasonType",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "weekNumber",
        "type": "uint8",
        "internalType": "uint8",
      },
    ],
    "outputs": [
      {
        "name": "gameIds",
        "type": "uint256[]",
        "internalType": "uint256[]",
      },
      {
        "name": "submissionDeadline",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "weekGames",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "seasonType",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "weekNumber",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "year",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "gamesCount",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "isFinalized",
        "type": "bool",
        "internalType": "bool",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "function",
    "name": "weekResults",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "outputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "packedResults",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "gamesCount",
        "type": "uint8",
        "internalType": "uint8",
      },
      {
        "name": "isFinalized",
        "type": "bool",
        "internalType": "bool",
      },
      {
        "name": "tiebreakerTotalPoints",
        "type": "uint256",
        "internalType": "uint256",
      },
      {
        "name": "tiebreakerGameId",
        "type": "uint256",
        "internalType": "uint256",
      },
    ],
    "stateMutability": "view",
  },
  {
    "type": "event",
    "name": "GameScoresRequested",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "GameScoresUpdated",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "ScoreChangesRequested",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "ScoreChangesUpdated",
    "inputs": [
      {
        "name": "gameId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "WeekGamesRequested",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "WeekGamesUpdated",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "gameCount",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "WeekResultsRequested",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "requestId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "event",
    "name": "WeekResultsUpdated",
    "inputs": [
      {
        "name": "weekId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256",
      },
      {
        "name": "gameCount",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8",
      },
      {
        "name": "allGamesCompleted",
        "type": "bool",
        "indexed": false,
        "internalType": "bool",
      },
    ],
    "anonymous": false,
  },
  {
    "type": "error",
    "name": "CooldownNotMet",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "GameNotCompleted",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "ScoreChangeIndexOutOfBounds",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "ScoreChangesAlreadyStored",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "UnknownReportType",
    "inputs": [
      {
        "name": "reportType",
        "type": "uint8",
        "internalType": "uint8",
      },
    ],
  },
  {
    "type": "error",
    "name": "WeekGamesAlreadyFinalized",
    "inputs": [],
  },
  {
    "type": "error",
    "name": "WeekResultsAlreadyFinalized",
    "inputs": [],
  },
] as const;
