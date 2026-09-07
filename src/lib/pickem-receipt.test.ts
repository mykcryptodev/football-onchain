import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";

import { abi } from "@/constants/abis/pickem";

import { submittedTokenId } from "./pickem-receipt";

const contract = "0x1111111111111111111111111111111111111111";
const wallet = "0x2222222222222222222222222222222222222222";
const other = "0x3333333333333333333333333333333333333333";
const log = (tokenId: bigint, address = contract, predictor = wallet) => ({
  address,
  topics: encodeEventTopics({
    abi,
    eventName: "PredictionSubmitted",
    args: { contestId: 7n, predictor: predictor as Hex },
  }) as Hex[],
  data: encodeAbiParameters([{ type: "uint256" }], [tokenId]),
});

test("uses the submitted receipt token, including token zero", () => {
  assert.equal(submittedTokenId([log(0n)], contract, wallet), "0");
  assert.equal(
    submittedTokenId([log(999999999999999999n)], contract, wallet),
    "999999999999999999",
  );
});
test("ignores unrelated logs in a batched receipt", () => {
  assert.equal(
    submittedTokenId(
      [
        { address: contract, topics: [], data: "0x" },
        log(12n, other),
        log(13n, contract, other),
        log(14n),
      ],
      contract,
      wallet,
    ),
    "14",
  );
});
test("does not substitute another entry when the receipt has no matching event", () => {
  assert.equal(
    submittedTokenId(
      [log(12n, other), log(13n, contract, other)],
      contract,
      wallet,
    ),
    null,
  );
});
