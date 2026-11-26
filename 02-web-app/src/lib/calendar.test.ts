import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthGrid,
  getActivityTier,
  getMonthSummary,
  parseDateKey,
  toDateKey,
} from "./calendar.ts";

test("buildMonthGrid creates aligned Sunday-to-Saturday weeks including leap February", () => {
  // Nov 2026 starts on Sunday (0) and has 30 days -> 35 cells
  const nov2026 = buildMonthGrid(2026, 10);
  assert.equal(nov2026.length, 35);
  assert.equal(nov2026[0].dateKey, "2026-11-01");
  assert.equal(nov2026[0].inCurrentMonth, true);
  assert.equal(nov2026[29].dateKey, "2026-11-30");
  assert.equal(nov2026[30].dateKey, "2026-12-01");
  assert.equal(nov2026[30].inCurrentMonth, false);

  // Leap year Feb 2024 has 29 days
  const feb2024 = buildMonthGrid(2024, 1);
  assert.equal(feb2024.length % 7, 0);
  assert.ok(feb2024.some((c) => c.dateKey === "2024-02-29" && c.inCurrentMonth));
});

test("getActivityTier buckets counts cleanly against daily target", () => {
  assert.equal(getActivityTier(0, 20), 0);
  assert.equal(getActivityTier(4, 20), 1);
  assert.equal(getActivityTier(10, 20), 2);
  assert.equal(getActivityTier(20, 20), 3);
  assert.equal(getActivityTier(35, 20), 3);
});

test("getMonthSummary aggregates active days and goal completions for one month", () => {
  const summary = getMonthSummary(
    {
      "2026-11-01": { answered: 22, correct: 18 },
      "2026-11-10": { answered: 10, correct: 7 },
      "2026-10-31": { answered: 25, correct: 25 },
    },
    2026,
    10,
    20
  );

  assert.equal(summary.activeDays, 2);
  assert.equal(summary.totalAnswered, 32);
  assert.equal(summary.totalCorrect, 25);
  assert.equal(summary.goalsMet, 1);
  assert.equal(toDateKey(2026, 0, 5), "2026-01-05");
  assert.deepEqual(parseDateKey("2027-07-04"), { year: 2027, monthIndex: 6, day: 4 });
});
