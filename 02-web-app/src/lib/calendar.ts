import type { DailyActivityMap } from "@/types/question";

export interface CalendarCell {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

export type ActivityTier = 0 | 1 | 2 | 3;

export function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): { year: number; monthIndex: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  return {
    year: Number(m[1]),
    monthIndex: Number(m[2]) - 1,
    day: Number(m[3]),
  };
}

/** Build a complete Sunday-Saturday calendar grid (35 or 42 cells) for a given month. */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();

  const cells: CalendarCell[] = [];

  // Leading days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    cells.push({
      dateKey: toDateKey(prevDate.getFullYear(), prevDate.getMonth(), dayNum),
      dayNumber: dayNum,
      inCurrentMonth: false,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    cells.push({
      dateKey: toDateKey(year, monthIndex, dayNum),
      dayNumber: dayNum,
      inCurrentMonth: true,
    });
  }

  // Trailing days to fill final week row cleanly
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const nextDate = new Date(year, monthIndex + 1, nextDay);
    cells.push({
      dateKey: toDateKey(nextDate.getFullYear(), nextDate.getMonth(), nextDay),
      dayNumber: nextDay,
      inCurrentMonth: false,
    });
    nextDay++;
  }

  return cells;
}

/** Map answered count against daily target into 4 heatmap tiers (0..3). */
export function getActivityTier(answered: number, dailyTarget: number): ActivityTier {
  if (answered <= 0) return 0;
  const safeTarget = Math.max(1, dailyTarget);
  if (answered >= safeTarget) return 3;
  if (answered >= Math.ceil(safeTarget * 0.5)) return 2;
  return 1;
}

/** Summarize total active days, total answered, and goal-hit days within YYYY-MM. */
export function getMonthSummary(
  dailyActivity: DailyActivityMap,
  year: number,
  monthIndex: number,
  dailyTarget: number
): { activeDays: number; totalAnswered: number; totalCorrect: number; goalsMet: number } {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  let activeDays = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;
  let goalsMet = 0;

  for (const [key, entry] of Object.entries(dailyActivity)) {
    if (!key.startsWith(prefix)) continue;
    const ans = entry?.answered ?? 0;
    const cor = entry?.correct ?? 0;
    if (ans > 0) {
      activeDays++;
      totalAnswered += ans;
      totalCorrect += cor;
      if (ans >= Math.max(1, dailyTarget)) {
        goalsMet++;
      }
    }
  }

  return { activeDays, totalAnswered, totalCorrect, goalsMet };
}

export function formatReadableDate(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const dt = new Date(parsed.year, parsed.monthIndex, parsed.day);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
