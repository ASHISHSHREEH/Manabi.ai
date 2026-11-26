"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Target, Trash2 } from "lucide-react";
import {
  buildMonthGrid,
  formatReadableDate,
  getActivityTier,
  getMonthSummary,
  parseDateKey,
} from "@/lib/calendar";
import { getLocalDateKey } from "@/lib/storage";
import type { DailyActivityMap } from "@/types/question";

interface StudyCalendarProps {
  dailyActivity: DailyActivityMap;
  dailyTarget: number;
  examDates: Record<string, string>;
  selectedExam?: string;
  onUpdateExamDate?: (exam: string, dateIso: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ASSIGNABLE_EXAMS = [
  { code: "JFT", label: "JFT-Basic" },
  { code: "N5", label: "N5" },
  { code: "N4", label: "N4" },
  { code: "N3", label: "N3" },
  { code: "N2", label: "N2" },
  { code: "N1", label: "N1" },
];

export function StudyCalendar({
  dailyActivity,
  dailyTarget,
  examDates,
  selectedExam,
  onUpdateExamDate,
}: StudyCalendarProps) {
  // Default SSR cursor cleanly to prevent hydration mismatch, then sync to real client date on mount
  const [todayKey, setTodayKey] = useState("2026-11-25");
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10); // 0-indexed (Nov)
  const [selectedDateKey, setSelectedDateKey] = useState("2026-11-25");

  useEffect(() => {
    const now = new Date();
    const realToday = getLocalDateKey(now);
    setTodayKey(realToday);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateKey(realToday);
  }, []);

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthSummary = useMemo(
    () => getMonthSummary(dailyActivity, viewYear, viewMonth, dailyTarget),
    [dailyActivity, viewYear, viewMonth, dailyTarget]
  );

  // Map YYYY-MM-DD -> array of exam codes scheduled that day
  const examsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [examCode, dateIso] of Object.entries(examDates)) {
      if (!dateIso) continue;
      (map[dateIso] ??= []).push(examCode);
    }
    return map;
  }, [examDates]);

  const monthTitle = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function jumpToDateKey(dateKey: string) {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return;
    setViewYear(parsed.year);
    setViewMonth(parsed.monthIndex);
    setSelectedDateKey(dateKey);
  }

  const activeCountdownExam =
    selectedExam && selectedExam !== "ALL" && examDates[selectedExam]
      ? selectedExam
      : Object.keys(examDates).find((k) => Boolean(examDates[k]));

  const selectedEntry = dailyActivity[selectedDateKey] ?? { answered: 0, correct: 0 };
  const selectedAcc =
    selectedEntry.answered > 0
      ? Math.round((selectedEntry.correct / selectedEntry.answered) * 100)
      : 0;
  const scheduledOnSelected = examsByDate[selectedDateKey] ?? [];
  const monthAcc =
    monthSummary.totalAnswered > 0
      ? Math.round((monthSummary.totalCorrect / monthSummary.totalAnswered) * 100)
      : 0;

  return (
    <section
      id="calendar"
      aria-labelledby="study-calendar-heading"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            <h2
              id="study-calendar-heading"
              className="m-0 text-[17px] font-bold text-slate-900 md:text-lg"
            >
              Study &amp; Exam Calendar
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {monthSummary.activeDays} active day{monthSummary.activeDays === 1 ? "" : "s"} ·{" "}
            {monthSummary.totalAnswered} Qs answered
            {monthSummary.totalAnswered > 0 ? ` (${monthAcc}% accuracy)` : ""} ·{" "}
            {monthSummary.goalsMet} goal{monthSummary.goalsMet === 1 ? "" : "s"} met
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeCountdownExam && examDates[activeCountdownExam] && (
            <button
              type="button"
              onClick={() => jumpToDateKey(examDates[activeCountdownExam])}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              <Flag className="h-3 w-3" aria-hidden="true" />
              {activeCountdownExam} Date
            </button>
          )}

          <button
            type="button"
            onClick={() => jumpToDateKey(todayKey)}
            className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>

          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] px-2 text-center text-xs font-bold text-slate-900 md:text-sm">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid + Selected Day Inspector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left 2 cols: Proper 7-col Calendar Grid */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              const entry = dailyActivity[cell.dateKey];
              const answered = entry?.answered ?? 0;
              const tier = getActivityTier(answered, dailyTarget);
              const examsHere = examsByDate[cell.dateKey] ?? [];
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateKey;

              const tierClasses =
                !cell.inCurrentMonth
                  ? "bg-slate-50/60 text-slate-300 border-slate-100"
                  : tier === 3
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : tier === 2
                      ? "bg-indigo-200/80 text-indigo-950 border-indigo-300"
                      : tier === 1
                        ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => {
                    if (!cell.inCurrentMonth) {
                      jumpToDateKey(cell.dateKey);
                    } else {
                      setSelectedDateKey(cell.dateKey);
                    }
                  }}
                  aria-label={`${cell.dateKey}: ${answered} questions`}
                  className={`relative flex min-h-[54px] cursor-pointer flex-col items-start justify-between rounded-xl border p-1.5 text-left transition-all md:min-h-[64px] md:p-2 ${tierClasses} ${
                    isSelected
                      ? "ring-2 ring-slate-900 ring-offset-1"
                      : isToday
                        ? "ring-2 ring-indigo-500"
                        : ""
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-xs font-bold tabular-nums">
                      {cell.dayNumber}
                    </span>
                    {isToday && (
                      <span
                        className={`rounded px-1 text-[9px] font-bold uppercase ${
                          tier === 3
                            ? "bg-white/25 text-white"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        Today
                      </span>
                    )}
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-between gap-1">
                    {answered > 0 && cell.inCurrentMonth && (
                      <span
                        className={`text-[10px] font-bold tabular-nums ${
                          tier === 3 ? "text-indigo-100" : "text-indigo-700"
                        }`}
                      >
                        {answered}Q
                      </span>
                    )}

                    {examsHere.length > 0 && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {examsHere[0]}
                        {examsHere.length > 1 ? `+${examsHere.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span>Activity:</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-slate-200 bg-white" /> 0
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-indigo-200 bg-indigo-50" /> Started
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-indigo-300 bg-indigo-200" /> 50%+
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-indigo-600" /> Goal ({dailyTarget}+)
              </span>
            </div>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Exam target day
            </span>
          </div>
        </div>

        {/* Right Col: Selected Day Inspector & Exam Date Setter */}
        <aside className="flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <span className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">
              Selected Day
            </span>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900">
              {formatReadableDate(selectedDateKey)}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Answered</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">
                {selectedEntry.answered}/{dailyTarget}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Accuracy</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">
                {selectedEntry.answered > 0 ? `${selectedAcc}%` : "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <Target
              className={`h-4 w-4 shrink-0 ${
                selectedEntry.answered >= dailyTarget
                  ? "text-emerald-600"
                  : "text-slate-400"
              }`}
            />
            <span className="text-slate-700">
              {selectedEntry.answered >= dailyTarget
                ? "Daily study goal completed!"
                : selectedEntry.answered > 0
                  ? `${dailyTarget - selectedEntry.answered} more to hit daily goal`
                  : "No study activity logged on this day"}
            </span>
          </div>

          {/* Exam date scheduling directly on the calendar */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Scheduled Exams
              </span>
              {scheduledOnSelected.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {scheduledOnSelected.join(", ")}
                </span>
              )}
            </div>

            {onUpdateExamDate && (
              <div className="mt-2">
                <p className="text-[11px] text-slate-500">
                  Tap an exam below to set or clear its target date on{" "}
                  <strong className="text-slate-700">{selectedDateKey}</strong>:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ASSIGNABLE_EXAMS.map((ex) => {
                    const isSetHere = examDates[ex.code] === selectedDateKey;
                    return (
                      <button
                        key={ex.code}
                        type="button"
                        onClick={() =>
                          onUpdateExamDate(ex.code, isSetHere ? "" : selectedDateKey)
                        }
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          isSetHere
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{ex.label}</span>
                        {isSetHere && <Trash2 className="h-2.5 w-2.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
