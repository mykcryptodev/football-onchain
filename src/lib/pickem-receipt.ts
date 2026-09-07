import { decodeEventLog, type Hex } from "viem";

import { abi } from "@/constants/abis/pickem";

/** Read only the entry emitted by our contract for the submitting wallet. */
export function submittedTokenId(
  logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[],
  contract: string,
  predictor: string,
): string | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
    try {
      const event = decodeEventLog({
        abi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
      });
      if (
        event.eventName === "PredictionSubmitted" &&
        event.args.predictor.toLowerCase() === predictor.toLowerCase()
      )
        return event.args.tokenId.toString();
    } catch {
      // Receipts also contain ERC20 approvals, transfers, and other events.
    }
  }
  return null;
}
