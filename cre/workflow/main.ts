/**
 * football-scores-oracle — CRE workflow
 *
 * Replaces the sunset Chainlink Functions DON for football-onchain.
 * Listens for request events on CREScoreOracle (Base mainnet), fetches ESPN,
 * and writes a signed report back to the oracle's onReport().
 * All parsing/packing lives in ./espn.ts (pure, unit-tested against live data).
 */
import {
  EVMClient,
  HTTPClient,
  handler,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  Runner,
  type Runtime,
  type EVMLog,
} from "@chainlink/cre-sdk"
import { keccak256, toBytes } from "viem"
import {
  ESPN_SUMMARY,
  ESPN_SCOREBOARD,
  buildGameScoresPayload,
  buildScoreChangesPayload,
  buildWeekGamesPayload,
  buildWeekResultsPayload,
  weekIdToParams,
} from "./espn"

type Config = {
  chainSelectorName: string
  oracleAddress: string
  gasLimit: string
}

const fetchJson = (runtime: Runtime<Config>, url: string): any => {
  const http = new HTTPClient()
  const resp = http
    .sendRequest(runtime, {
      url,
      method: "GET",
      // ESPN edge blocks browser-impersonating UAs; a plain client UA passes
      headers: { "Content-Type": "application/json", "User-Agent": "curl/8.0" },
    })
    .result()
  if (resp.statusCode !== 200) {
    throw new Error(`ESPN HTTP ${resp.statusCode} for ${url}`)
  }
  return JSON.parse(new TextDecoder().decode(resp.body))
}

const writeReport = (runtime: Runtime<Config>, evmClient: EVMClient, reportData: `0x${string}`): string => {
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.oracleAddress,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  if (writeResult.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`writeReport failed with status: ${writeResult.txStatus}`)
  }
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`Report delivered: ${txHash}`)
  return txHash
}

const topicToUint256 = (topic: Uint8Array): bigint => BigInt(bytesToHex(topic))

const makeEvmClient = (runtime: Runtime<Config>): EVMClient =>
  new EVMClient(getNetwork({ chainFamily: "evm", chainSelectorName: runtime.config.chainSelectorName })!.chainSelector.selector)

const onGameScoresRequested = (runtime: Runtime<Config>, log: EVMLog): string => {
  const gameId = topicToUint256(log.topics[1])
  runtime.log(`GameScoresRequested: gameId=${gameId}`)
  const data = fetchJson(runtime, `${ESPN_SUMMARY}?event=${gameId}`)
  return writeReport(runtime, makeEvmClient(runtime), buildGameScoresPayload(data, gameId))
}

const onScoreChangesRequested = (runtime: Runtime<Config>, log: EVMLog): string => {
  const gameId = topicToUint256(log.topics[1])
  runtime.log(`ScoreChangesRequested: gameId=${gameId}`)
  const data = fetchJson(runtime, `${ESPN_SUMMARY}?event=${gameId}`)
  return writeReport(runtime, makeEvmClient(runtime), buildScoreChangesPayload(data, gameId))
}

const onWeekGamesRequested = (runtime: Runtime<Config>, log: EVMLog): string => {
  const weekId = topicToUint256(log.topics[1])
  const { year, seasonType, weekNumber } = weekIdToParams(weekId)
  runtime.log(`WeekGamesRequested: ${year}/${seasonType}/${weekNumber}`)
  const data = fetchJson(runtime, `${ESPN_SCOREBOARD}?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`)
  return writeReport(runtime, makeEvmClient(runtime), buildWeekGamesPayload(data, weekId))
}

const onWeekResultsRequested = (runtime: Runtime<Config>, log: EVMLog): string => {
  const weekId = topicToUint256(log.topics[1])
  const { year, seasonType, weekNumber } = weekIdToParams(weekId)
  runtime.log(`WeekResultsRequested: ${year}/${seasonType}/${weekNumber}`)
  const data = fetchJson(runtime, `${ESPN_SCOREBOARD}?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`)
  const payload = buildWeekResultsPayload(weekId, data, async (gameId) =>
    fetchJson(runtime, `${ESPN_SUMMARY}?event=${gameId}`)
  )
  // buildWeekResultsPayload is async in the pure module; resolve before writing
  return payload instanceof Promise
    ? payload.then((p) => writeReport(runtime, makeEvmClient(runtime), p)) as unknown as string
    : writeReport(runtime, makeEvmClient(runtime), payload)
}

const EVENT_SIGS = {
  gameScores: keccak256(toBytes("GameScoresRequested(uint256,bytes32)")),
  scoreChanges: keccak256(toBytes("ScoreChangesRequested(uint256,bytes32)")),
  weekGames: keccak256(toBytes("WeekGamesRequested(uint256,bytes32)")),
  weekResults: keccak256(toBytes("WeekResultsRequested(uint256,bytes32)")),
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: config.chainSelectorName })
  if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

  const evmClient = new EVMClient(network.chainSelector.selector)
  const oracle = hexToBase64(config.oracleAddress)

  return [
    handler(evmClient.logTrigger({ addresses: [oracle], topics: [{ values: [hexToBase64(EVENT_SIGS.gameScores)] }] }), onGameScoresRequested),
    handler(evmClient.logTrigger({ addresses: [oracle], topics: [{ values: [hexToBase64(EVENT_SIGS.scoreChanges)] }] }), onScoreChangesRequested),
    handler(evmClient.logTrigger({ addresses: [oracle], topics: [{ values: [hexToBase64(EVENT_SIGS.weekGames)] }] }), onWeekGamesRequested),
    handler(evmClient.logTrigger({ addresses: [oracle], topics: [{ values: [hexToBase64(EVENT_SIGS.weekResults)] }] }), onWeekResultsRequested),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
