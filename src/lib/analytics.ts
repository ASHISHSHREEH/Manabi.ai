import type {
  DailyActivityMap,
  ProgressMap,
  Question,
} from "../types/question.ts";
import { getLocalDateKey } from "./storage.ts";

export interface ExamBreakdown {
  exam: string;
  total: number;
  seen: number;
  mastered: number;
  accuracy: number;
}

export interface SectionBreakdown {
  section: string;
  total: number;
  seen: number;
  missedOrUnseen: number;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface WeeklyDayPoint {
  dateKey: string;
  dayLabel: string;
  answered: number;
  correct: number;
}

export interface LevelSnapshot {
  exam: string;
  total: number;
  seen: number;
  mastered: number;
  missedOrUnseen: number;
  attempts: number;
  correct: number;
  accuracyPct: number;
  sections: SectionBreakdown[];
}

/** Compute consecutive study days ending today (or yesterday if none logged today yet). */
export function calculateStreakDays(
  dailyActivity: DailyActivityMap,
  today: Date = new Date()
): number {
  const todayKey = getLocalDateKey(today);
  const hasToday = (dailyActivity[todayKey]?.answered ?? 0) > 0;

  const cursor = new Date(today);
  if (!hasToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = getLocalDateKey(cursor);
    if ((dailyActivity[key]?.answered ?? 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Build last 7 calendar days of study activity for the Recharts bar chart. */
export function buildWeeklySeries(
  dailyActivity: DailyActivityMap,
  today: Date = new Date()
): WeeklyDayPoint[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: WeeklyDayPoint[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = getLocalDateKey(d);
    const entry = dailyActivity[key];
    points.push({
      dateKey: key,
      dayLabel: labels[d.getDay()],
      answered: entry?.answered ?? 0,
      correct: entry?.correct ?? 0,
    });
  }
  return points;
}

/** Compute overall KPI totals from saved progress and daily activity. */
export function computeSummaryStats(
  questions: Question[],
  progress: ProgressMap,
  dailyActivity: DailyActivityMap,
  today: Date = new Date()
) {
  const attempts = Object.values(progress).reduce((s, r) => s + r.times_seen, 0);
  const correct = Object.values(progress).reduce((s, r) => s + r.times_correct, 0);
  const uniqueSeen = Object.keys(progress).filter(
    (id) => (progress[id]?.times_seen ?? 0) > 0
  ).length;
  const needsReviewCount = questions.filter((q) => {
    const p = progress[q.id];
    return !p || !p.last_correct;
  }).length;

  const todayKey = getLocalDateKey(today);
  const todayAnswered = dailyActivity[todayKey]?.answered ?? 0;

  return {
    totalQuestions: questions.length,
    totalAttempts: attempts,
    totalCorrect: correct,
    accuracyPct: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    uniqueSeen,
    needsReviewCount,
    streakDays: calculateStreakDays(dailyActivity, today),
    todayAnswered,
  };
}

/** Compute per-exam coverage and accuracy for JFT, N4, N3, N2, N1. */
export function computeExamBreakdowns(
  questions: Question[],
  progress: ProgressMap
): ExamBreakdown[] {
  const exams = ["JFT", "N4", "N3", "N2", "N1"];
  const result: ExamBreakdown[] = [];

  for (const exam of exams) {
    const list = questions.filter((q) => q.exam.toUpperCase() === exam);
    if (list.length === 0 && !["JFT", "N3", "N2", "N1"].includes(exam)) continue;

    let seen = 0;
    let mastered = 0;
    let attempts = 0;
    let correct = 0;

    for (const q of list) {
      const r = progress[q.id];
      if (r && r.times_seen > 0) {
        seen++;
        if (r.last_correct) mastered++;
        attempts += r.times_seen;
        correct += r.times_correct;
      }
    }

    result.push({
      exam,
      total: list.length,
      seen,
      mastered,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    });
  }

  return result;
}

/** Compute accuracy and coverage per section for a given exam ("ALL" for combined). */
export function computeLevelSnapshot(
  questions: Question[],
  progress: ProgressMap,
  exam: string = "ALL"
): LevelSnapshot {
  const scoped =
    exam === "ALL"
      ? questions
      : questions.filter((q) => q.exam.toUpperCase() === exam.toUpperCase());

  let seen = 0;
  let mastered = 0;
  let missedOrUnseen = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (const q of scoped) {
    const r = progress[q.id];
    if (r && r.times_seen > 0) {
      seen++;
      if (r.last_correct) {
        mastered++;
      } else {
        missedOrUnseen++;
      }
      totalAttempts += r.times_seen;
      totalCorrect += r.times_correct;
    } else {
      missedOrUnseen++;
    }
  }

  const sectionNames = ["vocabulary", "grammar", "reading", "listening"];
  const sections: SectionBreakdown[] = sectionNames.map((section) => {
    const list = scoped.filter((q) => q.section.toLowerCase() === section);
    let secSeen = 0;
    let secMissedOrUnseen = 0;
    let attempts = 0;
    let correct = 0;

    for (const q of list) {
      const r = progress[q.id];
      if (r && r.times_seen > 0) {
        secSeen++;
        if (!r.last_correct) secMissedOrUnseen++;
        attempts += r.times_seen;
        correct += r.times_correct;
      } else {
        secMissedOrUnseen++;
      }
    }

    return {
      section,
      total: list.length,
      seen: secSeen,
      missedOrUnseen: secMissedOrUnseen,
      attempts,
      correct,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    };
  });

  return {
    exam,
    total: scoped.length,
    seen,
    mastered,
    missedOrUnseen,
    attempts: totalAttempts,
    correct: totalCorrect,
    accuracyPct:
      totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    sections,
  };
}
