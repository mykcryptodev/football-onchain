import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  isPastSlateCutoff,
  nextWeekRef,
  resolveThisWeekEntries,
  type SlateGame,
} from "./pickem-upcoming";

const ref = (week: number) => ({ seasonYear: 2026, seasonType: 2, week });
const entry = (weekNumber: number, id = weekNumber) => ({
  year: 2026,
  seasonType: 2,
  weekNumber,
  id,
});
const owned = [entry(1), entry(2), entry(3)];
const schedules: Record<number, SlateGame[]> = {
  1: [
    { kickoff: "2026-09-10T00:20:00Z", completed: true },
    { kickoff: "2026-09-15T00:15:00Z", completed: true },
  ],
  2: [
    { kickoff: "2026-09-18T00:15:00Z", completed: false },
    { kickoff: "2026-09-22T00:15:00Z", completed: false },
  ],
  3: [{ kickoff: "2026-09-25T00:15:00Z", completed: false }],
};
const load = async (_year: number, _type: number, week: number) =>
  schedules[week] ?? [];

for (const [label, date, expected] of [
  ["before EDT cutoff", "2026-09-15T23:59:59Z", false],
  ["exact EDT cutoff", "2026-09-16T00:00:00Z", true],
  ["Wednesday", "2026-09-16T13:00:00Z", true],
  ["Sunday remains promoted", "2026-09-20T17:00:00Z", true],
  ["Monday remains promoted", "2026-09-21T17:00:00Z", true],
] as const)
  test(label, () =>
    assert.equal(isPastSlateCutoff(new Date(date), schedules[2]), expected),
  );

for (const [label, kickoff, before, at] of [
  [
    "EST",
    "2026-11-06T01:15:00Z",
    "2026-11-04T00:59:59Z",
    "2026-11-04T01:00:00Z",
  ],
  [
    "DST transition Sunday",
    "2026-11-01T18:00:00Z",
    "2026-10-27T23:59:59Z",
    "2026-10-28T00:00:00Z",
  ],
] as const)
  test(label, () => {
    assert.equal(isPastSlateCutoff(new Date(before), [{ kickoff }]), false);
    assert.equal(isPastSlateCutoff(new Date(at), [{ kickoff }]), true);
  });

test("invalid or empty schedule cannot promote", () => {
  const now = new Date("2026-09-16T13:00Z");
  assert.equal(isPastSlateCutoff(now, []), false);
  assert.equal(isPastSlateCutoff(now, [{ kickoff: "bad" }]), false);
  assert.equal(isPastSlateCutoff(new Date("bad"), schedules[2]), false);
});

for (const week of [1, 2]) {
  for (const date of [
    "2026-09-16T13:00Z",
    "2026-09-19T17:00Z",
    "2026-09-20T17:00Z",
    "2026-09-21T17:00Z",
  ]) {
    test(`ESPN week ${week}, wallet weeks 1/2/3 at ${date} selects 2`, async () => {
      assert.deepEqual(
        await resolveThisWeekEntries(owned, ref(week), new Date(date), load),
        [entry(2)],
      );
    });
  }
}
test("before cutoff retains finished week; exact cutoff promotes all upcoming contests", async () => {
  const entries = [...owned, entry(2, 22)];
  assert.deepEqual(
    await resolveThisWeekEntries(
      entries,
      ref(1),
      new Date("2026-09-15T23:59:59Z"),
      load,
    ),
    [entry(1)],
  );
  assert.deepEqual(
    await resolveThisWeekEntries(
      entries,
      ref(1),
      new Date("2026-09-16T00:00Z"),
      load,
    ),
    [entry(2), entry(2, 22)],
  );
});
test("no upcoming ownership preserves fallback without fetching schedules", async () => {
  assert.deepEqual(
    await resolveThisWeekEntries(
      [entry(1), entry(3)],
      ref(1),
      new Date("2026-09-16T13:00Z"),
      async () => {
        throw Error("must not fetch");
      },
    ),
    [entry(1)],
  );
});
test("empty wallet stays empty", async () => {
  assert.deepEqual(
    await resolveThisWeekEntries([], ref(1), new Date(), load),
    [],
  );
});
test("live current slate never skipped even after next cutoff", async () => {
  assert.deepEqual(
    await resolveThisWeekEntries(
      owned,
      ref(2),
      new Date("2026-09-23T01:00Z"),
      load,
    ),
    [entry(2)],
  );
});
test("Week 3 becomes eligible only after Week 2 completes and its own cutoff passes", async () => {
  const finished = async (y: number, t: number, w: number) =>
    w === 2
      ? schedules[2].map(g => ({ ...g, completed: true }))
      : load(y, t, w);
  assert.deepEqual(
    await resolveThisWeekEntries(
      owned,
      ref(2),
      new Date("2026-09-22T23:59:59Z"),
      finished,
    ),
    [entry(2)],
  );
  assert.deepEqual(
    await resolveThisWeekEntries(
      owned,
      ref(2),
      new Date("2026-09-23T00:00Z"),
      finished,
    ),
    [entry(3)],
  );
});
for (const failedWeek of [1, 2]) {
  for (const failure of ["empty", "reject", "invalid"] as const)
    test(`schedule ${failedWeek} ${failure} preserves picks`, async () => {
      const loader = async (y: number, t: number, w: number) => {
        if (w !== failedWeek) return load(y, t, w);
        if (failure === "reject") throw Error("unavailable");
        return failure === "empty" ? [] : [{ kickoff: "invalid" }];
      };
      assert.deepEqual(
        await resolveThisWeekEntries(
          owned,
          ref(1),
          new Date("2026-09-16T13:00Z"),
          loader,
        ),
        [entry(1)],
      );
    });
}
test("existing previous week fallback is preserved", async () => {
  assert.deepEqual(
    await resolveThisWeekEntries([entry(1)], ref(2), new Date(), load),
    [entry(1)],
  );
});
test("season boundaries conservative and unknown type rejected", () => {
  for (const [seasonType, week] of [
    [1, 4],
    [2, 18],
    [3, 5],
    [9, 1],
  ])
    assert.equal(nextWeekRef({ ...ref(week), seasonType }), null);
  assert.deepEqual(nextWeekRef(ref(1)), ref(2));
});
test("cross-season existing fallback remains intact", async () => {
  const entries = [{ ...entry(4), seasonType: 1 }];
  assert.deepEqual(
    await resolveThisWeekEntries(entries, ref(1), new Date(), load),
    entries,
  );
});
test("hook limits promotion to current scope and uses cached schedules; open page reevaluates", () => {
  const source = readFileSync("src/hooks/useMyCurrentWeekPicks.ts", "utf8");
  assert.match(
    source,
    /typeof scope === "number"[\s\S]*scope === "all"[\s\S]*await resolveThisWeekEntries/,
  );
  assert.match(
    source,
    /resolveThisWeekEntries\([\s\S]*?new Date\(\),\s*loadWeekGames/,
  );
  assert.ok(
    source.indexOf("const loadWeekGames =") <
      source.indexOf("await resolveThisWeekEntries"),
  );
  assert.match(source, /refetchInterval: 30 \* 1000/);
});
