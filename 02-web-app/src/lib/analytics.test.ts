import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklySeries,
  calculateBestStreakDays,
  calculateStreakDays,
  computeExamBreakdowns,
  computeLevelSnapshot,
  computeSummaryStats,
} from "./analytics.ts";
import type { ProgressMap, Question } from "../types/question.ts";

test("calculateStreakDays counts consecutive days ending today or yesterday", () => {
  const today = new Date("2026-11-19T12:00:00");
  assert.equal(calculateStreakDays({}, today), 0);

  assert.equal(
    calculateStreakDays(
      {
        "2026-11-17": { answered: 5, correct: 4 },
        "2026-11-18": { answered: 3, correct: 3 },
      },
      today
    ),
    2
  );

  assert.equal(
    calculateStreakDays(
      {
        "2026-11-16": { answered: 10, correct: 8 },
        "2026-11-18": { answered: 3, correct: 3 },
        "2026-11-19": { answered: 2, correct: 2 },
      },
      today
    ),
    2
  );
});

test("buildWeeklySeries returns 7 ordered days ending on reference date", () => {
  const today = new Date("2026-11-19T12:00:00");
  const series = buildWeeklySeries(
    {
      "2026-11-13": { answered: 4, correct: 2 },
      "2026-11-19": { answered: 7, correct: 6 },
    },
    today
  );

  assert.equal(series.length, 7);
  assert.equal(series[0].dateKey, "2026-11-13");
  assert.equal(series[0].answered, 4);
  assert.equal(series[6].dateKey, "2026-11-19");
  assert.equal(series[6].correct, 6);
});

test("calculateBestStreakDays finds longest consecutive active run", () => {
  assert.equal(calculateBestStreakDays({}, 0), 0);
  assert.equal(
    calculateBestStreakDays(
      {
        "2026-11-10": { answered: 4, correct: 3 },
        "2026-11-11": { answered: 2, correct: 2 },
        "2026-11-12": { answered: 8, correct: 7 },
        "2026-11-15": { answered: 1, correct: 1 },
      },
      1
    ),
    3
  );
});

test("computeSummaryStats, computeExamBreakdowns, and computeLevelSnapshot aggregate real progress", () => {
  const questions: Question[] = [
    {
      id: "N2-001",
      exam: "N2",
      section: "grammar",
      question: "Q1",
      choices: ["a", "b"],
      answer: "a",
      explanation: "exp",
    },
    {
      id: "N2-002",
      exam: "N2",
      section: "vocabulary",
      question: "Q2",
      choices: ["a", "b"],
      answer: "b",
      explanation: "exp",
    },
    {
      id: "N1-001",
      exam: "N1",
      section: "reading",
      question: "Q3",
      choices: ["a", "b"],
      answer: "a",
      explanation: "exp",
    },
  ];
  const progress: ProgressMap = {
    "N2-001": {
      times_seen: 2,
      times_correct: 1,
      last_seen: "2026-11-19",
      last_correct: true,
    },
  };
  const today = new Date("2026-11-19T12:00:00");
  const summary = computeSummaryStats(
    questions,
    progress,
    { "2026-11-19": { answered: 2, correct: 1 } },
    today
  );

  assert.equal(summary.totalQuestions, 3);
  assert.equal(summary.totalAttempts, 2);
  assert.equal(summary.accuracyPct, 50);
  assert.equal(summary.needsReviewCount, 2);

  const exams = computeExamBreakdowns(questions, progress);
  const n2 = exams.find((e) => e.exam === "N2");
  assert.ok(n2);
  assert.equal(n2.total, 2);
  assert.equal(n2.seen, 1);
  assert.equal(n2.mastered, 1);

  const n2Snap = computeLevelSnapshot(questions, progress, "N2");
  assert.equal(n2Snap.total, 2);
  assert.equal(n2Snap.mastered, 1);
  assert.equal(n2Snap.missedOrUnseen, 1);
  assert.equal(n2Snap.accuracyPct, 50);
  const grammarSec = n2Snap.sections.find((s) => s.section === "grammar");
  assert.equal(grammarSec?.total, 1);
  assert.equal(grammarSec?.accuracy, 50);
});
