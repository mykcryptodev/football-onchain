import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type Matchup,
  parsePicks,
  pickTemplate,
  settlementStep,
} from "./picks";

const games: Matchup[] = [
  {
    gameId: "9",
    away: "CLE",
    home: "NE",
    kickoff: "2026-09-13",
    completed: false,
  },
  {
    gameId: "2",
    away: "SEA",
    home: "NYG",
    kickoff: "2026-09-14",
    completed: false,
  },
  {
    gameId: "7",
    away: "BUF",
    home: "NYJ",
    kickoff: "2026-09-14",
    completed: false,
  },
];
const tiebreaker = games[2];
test("blank template preserves contract order and ends with the tiebreaker line", () =>
  assert.equal(
    pickTemplate(games, tiebreaker),
    "1. CLE vs NE: \n2. SEA vs NYG: \n3. BUF vs NYJ: \nTiebreaker (combined points, BUF vs NYJ): ",
  ));
test("full matchup and abbreviated responses produce the same picks", () => {
  assert.deepEqual(
    parsePicks(
      "1. CLE vs NE: NE\n2. SEA vs NYG: SEA\n3. BUF vs NYJ: NYJ",
      games,
    ).picks,
    [1, 0, 1],
  );
  assert.deepEqual(parsePicks("1. ne\n2. SEA\n3. NYJ", games).picks, [1, 0, 1]);
});
test("omissions stay blank and random fill preserves explicit choices", () => {
  assert.deepEqual(parsePicks("1. NE", games).missing, [2, 3]);
  const result = parsePicks(
    "1. NE\n2. SEA vs NYG: \nFill in the rest randomly",
    games,
    () => 0.2,
  );
  assert.deepEqual(result.picks, [1, 0, 0]);
  assert.deepEqual(result.randomized, [2, 3]);
});
test("the tiebreaker line is parsed out of the same reply, never a separate message", () => {
  const filled = parsePicks(
    "1. NE\n2. SEA\n3. NYJ\nTiebreaker (combined points, BUF vs NYJ): 45",
    games,
  );
  assert.equal(filled.tiebreakerPoints, 45);
  assert.deepEqual(filled.missing, []);

  // A copied-but-still-blank tiebreaker line is "not answered yet," not an
  // error — same treatment as a blank game pick.
  const blank = parsePicks(
    "1. NE\n2. SEA\n3. NYJ\nTiebreaker (combined points, BUF vs NYJ): ",
    games,
  );
  assert.equal(blank.tiebreakerPoints, null);

  // Absent entirely (e.g. a hand-typed reply that skipped it) is the same
  // as blank, not an error.
  assert.equal(parsePicks("1. NE\n2. SEA\n3. NYJ", games).tiebreakerPoints, null);

  // Retyped without the parenthetical still matches by the leading word.
  assert.equal(
    parsePicks(
      "1. NE\n2. SEA\n3. NYJ\nTiebreaker: 51",
      games,
    ).tiebreakerPoints,
    51,
  );
});
test("rejects wrong matchups, duplicate numbers and invalid choices without silently randomizing", () => {
  for (const text of [
    "1. NYG",
    "1. NE\n1. CLE",
    "0. NE",
    "4. NE",
    "1. NE vs CLE: NE",
    "NE",
    "1. garbage\nFill in the rest randomly",
  ])
    assert.throws(() => parsePicks(text, games));
});
const state = {
  payoutComplete: false,
  hasClaimedPrize: false,
  submissionDeadline: 1n,
  totalEntries: 20n,
  oracleFinalized: true,
  gamesFinalized: true,
  slateMatches: true,
  unscored: [] as bigint[],
  now: 200n,
  payoutDeadline: 100n,
};
test("scores every entry before payout even after deadline", () => {
  assert.equal(settlementStep({ ...state, unscored: [1000n] }), "score");
  assert.equal(settlementStep(state), "pay");
});
test("finalization, mandatory delay and completed jobs", () => {
  assert.equal(settlementStep({ ...state, oracleFinalized: false }), "oracle");
  assert.equal(settlementStep({ ...state, gamesFinalized: false }), "finalize");
  assert.equal(settlementStep({ ...state, now: 99n }), "wait");
  assert.equal(settlementStep({ ...state, now: 100n }), "pay");
  assert.equal(settlementStep({ ...state, payoutComplete: true }), "complete");
});
test("blocks positional slate mismatch and premature payouts", () => {
  assert.equal(
    settlementStep({ ...state, slateMatches: false }),
    "blocked-slate",
  );
  assert.equal(
    settlementStep({ ...state, payoutComplete: true, unscored: [1n] }),
    "blocked-incomplete-payout",
  );
  assert.equal(settlementStep({ ...state, totalEntries: 0n }), "empty");
});

test("waits for custom submission deadline and blocks partially paid unscored fields", () => {
  assert.equal(
    settlementStep({ ...state, submissionDeadline: 201n }),
    "wait-entries",
  );
  assert.equal(
    settlementStep({ ...state, hasClaimedPrize: true, unscored: [1n] }),
    "blocked-incomplete-payout",
  );
});
