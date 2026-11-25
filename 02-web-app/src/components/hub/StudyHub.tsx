"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Pencil, Play, X } from "lucide-react";
import type { LevelSnapshot, SectionBreakdown, WeeklyDayPoint } from "@/lib/analytics";
import type { LastPracticeSession, Question } from "@/types/question";

interface StudyHubProps {
  questions: Question[];
  selectedExam: string;
  onSelectExam: (exam: string) => void;
  snapshot: LevelSnapshot;
  wrongCount: number;
  todayAnswered: number;
  dailyTarget: number;
  streakDays: number;
  bestStreakDays: number;
  weeklySeries: WeeklyDayPoint[];
  profileName: string;
  examDates: Record<string, string>;
  lastBackupAt?: string;
  lastSession?: LastPracticeSession;
  onUpdateProfileName: (name: string) => void;
  onUpdateExamDate: (exam: string, dateIso: string) => void;
  onExportBackup: () => void;
  onStartSmartSession: () => void;
  onStartQuiz: (opts: {
    exam: string;
    section: string;
    missedOnly: boolean;
    limit?: number;
  }) => void;
  onOpenBank: () => void;
  onOpenStats: () => void;
}

const SECTION_LABELS: Record<string, { name: string; jp: string }> = {
  vocabulary: { name: "Vocabulary", jp: "文字・語彙" },
  grammar: { name: "Grammar", jp: "文法" },
  reading: { name: "Reading", jp: "読解" },
  listening: { name: "Listening", jp: "聴解" },
};

const LEVEL_TABS = [
  { id: "ALL", label: "All", shortLabel: "All" },
  { id: "JFT", label: "JFT-Basic", shortLabel: "JFT" },
  { id: "N4", label: "N4", shortLabel: "N4" },
  { id: "N3", label: "N3", shortLabel: "N3" },
  { id: "N2", label: "N2", shortLabel: "N2" },
  { id: "N1", label: "N1", shortLabel: "N1" },
];

const EXAM_FULL_NAME: Record<string, string> = {
  ALL: "All Exams",
  JFT: "JFT-Basic",
  N4: "JLPT N4",
  N3: "JLPT N3",
  N2: "JLPT N2",
  N1: "JLPT N1",
};

const EXAM_SHORT_NAME: Record<string, string> = {
  ALL: "All",
  JFT: "JFT",
  N4: "N4",
  N3: "N3",
  N2: "N2",
  N1: "N1",
};

function formatDateHeader(date: Date): string {
  const weekday = date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const monthDay = date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  return `${weekday} · ${monthDay}`;
}

function formatShortDate(dateIso: string): string {
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeDaysUntil(dateIso: string, now: Date): number | null {
  const target = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000);
}

function formatRelativeBackup(iso: string | undefined, now: Date): string {
  if (!iso) return "No backup yet";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Backup saved";
  const diffDays = Math.floor((now.getTime() - dt.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Last backup today";
  if (diffDays === 1) return "Last backup 1 day ago";
  return `Last backup ${diffDays} days ago`;
}

export function StudyHub({
  questions,
  selectedExam,
  onSelectExam,
  snapshot,
  wrongCount,
  todayAnswered,
  dailyTarget,
  streakDays,
  bestStreakDays,
  weeklySeries,
  profileName,
  examDates,
  lastBackupAt,
  lastSession,
  onUpdateProfileName,
  onUpdateExamDate,
  onExportBackup,
  onStartSmartSession,
  onStartQuiz,
  onOpenBank,
  onOpenStats,
}: StudyHubProps) {
  const [mountedNow, setMountedNow] = useState<Date | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profileName);

  useEffect(() => {
    setMountedNow(new Date());
  }, []);

  useEffect(() => {
    setDraftName(profileName);
  }, [profileName]);

  const countdownExam = selectedExam === "ALL" ? "N2" : selectedExam;
  const countdownDateIso = examDates[countdownExam] ?? "";
  const daysLeft =
    mountedNow && countdownDateIso
      ? computeDaysUntil(countdownDateIso, mountedNow)
      : null;

  const examFullLabel = EXAM_FULL_NAME[selectedExam] ?? selectedExam;
  const examShortLabel = EXAM_SHORT_NAME[selectedExam] ?? selectedExam;
  const countdownExamFull = EXAM_FULL_NAME[countdownExam] ?? countdownExam;

  const secondaryTargets = useMemo(() => {
    const base = ["N2", "JFT", "N1"];
    const others = base.filter((e) => e !== selectedExam);
    return others.map((e) => (e === "JFT" ? "JFT-Basic" : e)).join(" and ");
  }, [selectedExam]);

  const seenPct =
    snapshot.total > 0 ? Math.round((snapshot.seen / snapshot.total) * 100) : 0;
  const dailyPct =
    dailyTarget > 0
      ? Math.min(100, Math.round((todayAnswered / dailyTarget) * 100))
      : 0;
  const dailyRemaining = Math.max(0, dailyTarget - todayAnswered);

  // Order sections weakest-first: attempted sections by accuracy asc, then unattempted populated sections, then empty.
  const orderedSections = useMemo(() => {
    return [...snapshot.sections].sort((a, b) => {
      const aEmpty = a.total === 0 ? 1 : 0;
      const bEmpty = b.total === 0 ? 1 : 0;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;

      const aAttempted = a.attempts > 0 ? 0 : 1;
      const bAttempted = b.attempts > 0 ? 0 : 1;
      if (aAttempted !== bAttempted) return aAttempted - bAttempted;

      if (a.attempts > 0 && b.attempts > 0 && a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }
      return b.total - a.total;
    });
  }, [snapshot.sections]);

  const weakestSection: SectionBreakdown | undefined = useMemo(
    () => orderedSections.find((s) => s.total > 0),
    [orderedSections]
  );

  // Determine Continue step target
  const continueTarget = useMemo(() => {
    if (lastSession) {
      const matchingSec = snapshot.sections.find(
        (s) => s.section === lastSession.section && s.total > 0
      );
      if (
        (lastSession.exam === selectedExam || selectedExam === "ALL") &&
        matchingSec
      ) {
        return {
          exam: lastSession.exam,
          section: lastSession.section,
          secData: matchingSec,
        };
      }
    }
    const fallback =
      snapshot.sections.find((s) => s.section === "grammar" && s.total > 0) ??
      snapshot.sections.find((s) => s.total > 0);
    return fallback
      ? { exam: selectedExam, section: fallback.section, secData: fallback }
      : null;
  }, [lastSession, selectedExam, snapshot.sections]);

  const smartSessionSize = Math.min(20, Math.max(snapshot.total, 1));

  // Level counts across full bank
  const examCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: questions.length };
    for (const q of questions) {
      counts[q.exam] = (counts[q.exam] ?? 0) + 1;
    }
    return counts;
  }, [questions]);

  // Weekly chart scaling
  const weeklyTotal = weeklySeries.reduce((s, d) => s + d.answered, 0);
  const maxChartVal = Math.max(
    dailyTarget,
    ...weeklySeries.map((d) => d.answered),
    5
  );
  const targetLineBottomPx = Math.round((dailyTarget / maxChartVal) * 96);

  function openDateEditor() {
    setDraftDate(countdownDateIso || "");
    setEditingDate(true);
  }

  function handleSaveDate() {
    onUpdateExamDate(countdownExam, draftDate);
    setEditingDate(false);
  }

  function handleSaveName() {
    onUpdateProfileName(draftName);
    setEditingName(false);
  }

  const weakName = weakestSection
    ? (SECTION_LABELS[weakestSection.section]?.name ?? weakestSection.section)
    : "Practice";

  const continueExamShort = continueTarget
    ? (EXAM_SHORT_NAME[continueTarget.exam] ?? continueTarget.exam)
    : examShortLabel;
  const continueSecName = continueTarget
    ? (SECTION_LABELS[continueTarget.section]?.name ?? continueTarget.section)
    : "Grammar";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* 1. Greeting + Indigo Exam Countdown */}
      <section className="flex flex-wrap items-stretch gap-4 md:gap-5">
        <div className="flex min-w-0 flex-[999_1_420px] flex-col justify-center gap-1 md:gap-2">
          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-500">
            {mountedNow ? formatDateHeader(mountedNow) : "STUDY DASHBOARD"}
          </div>
          <h1 className="m-0 text-[26px] leading-[1.2] font-bold text-slate-900 md:text-[32px]">
            Okaeri, {profileName}
          </h1>
          <p className="m-0 text-sm text-slate-600 md:text-[15px]">
            Main target:{" "}
            <strong className="font-bold text-slate-900">{examFullLabel}</strong>
            {secondaryTargets && (
              <span className="hidden md:inline">
                {" "}
                · also preparing {secondaryTargets}
              </span>
            )}
          </p>
        </div>

        <div
          className="flex flex-[1_1_340px] flex-col gap-2.5 rounded-2xl p-4 text-white shadow-sm md:gap-3 md:p-5"
          style={{ background: "linear-gradient(135deg, #4338ca, #4f46e5)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-white/85">
              EXAM COUNTDOWN
            </span>
            <button
              type="button"
              onClick={() => (editingDate ? setEditingDate(false) : openDateEditor())}
              className="cursor-pointer text-[13px] text-white underline hover:text-white/90"
            >
              {editingDate ? "Cancel" : "Edit date"}
            </button>
          </div>

          {editingDate ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/15 p-2.5">
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                aria-label={`Target date for ${countdownExamFull}`}
                className="min-h-9 flex-1 rounded-lg bg-white px-2.5 py-1 text-sm font-medium text-slate-900"
              />
              <button
                type="button"
                onClick={handleSaveDate}
                className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
              {countdownDateIso && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateExamDate(countdownExam, "");
                    setEditingDate(false);
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-white/20 px-2.5 text-xs font-semibold text-white hover:bg-white/30"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-4xl leading-none font-bold tabular-nums md:text-[40px]">
                {daysLeft !== null ? Math.max(0, daysLeft) : "—"}
              </span>
              <span className="text-sm text-white/85 md:text-[15px]">
                {daysLeft !== null
                  ? `days to ${countdownExamFull} · ${formatShortDate(countdownDateIso)}`
                  : `Set target date for ${countdownExamFull}`}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px] text-white/85">
              <span>{examShortLabel} questions seen</span>
              <span className="font-bold text-white tabular-nums">
                {snapshot.seen}/{snapshot.total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-2.5 rounded-full bg-white transition-all duration-500"
                style={{ width: `${seenPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Today's plan */}
      <section
        aria-labelledby="today-plan-heading"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:gap-3.5 md:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="today-plan-heading"
              className="m-0 text-[17px] font-bold text-slate-900 md:text-lg"
            >
              Today&apos;s plan
            </h2>
            <p className="mt-1 hidden text-[13px] text-slate-500 md:block">
              Built from your due reviews, last session and weakest section
            </p>
          </div>

          <button
            type="button"
            onClick={onStartSmartSession}
            disabled={snapshot.total === 0}
            className="hidden h-12 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[15px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Start session · {smartSessionSize} questions
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Step 1: Review */}
          <button
            type="button"
            onClick={() =>
              onStartQuiz({
                exam: selectedExam,
                section: "ALL",
                missedOnly: true,
                limit: 20,
              })
            }
            disabled={snapshot.total === 0}
            className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50 md:flex-col md:items-start md:justify-between md:gap-1.5 md:p-3.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-bold text-indigo-700 md:hidden">
              1
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.08em] text-slate-500 md:block">
              1 · REVIEW
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:w-full">
              <span className="text-[15px] font-bold text-slate-900">
                {wrongCount > 0
                  ? `${wrongCount} question${wrongCount === 1 ? "" : "s"} due`
                  : `${Math.min(20, snapshot.missedOrUnseen)} new questions`}
              </span>
              <span className="text-[13px] text-slate-600">
                {wrongCount > 0
                  ? "Ones you got wrong, coming back on schedule"
                  : `Fresh ${examShortLabel} items ready to drill`}
              </span>
            </div>

            <ArrowRight
              className="h-4 w-4 shrink-0 text-slate-500 md:hidden"
              aria-hidden="true"
            />
            <span className="mt-1 hidden text-[13px] font-bold text-indigo-700 md:inline">
              {wrongCount > 0 ? "Review now →" : "Start drill →"}
            </span>
          </button>

          {/* Step 2: Continue */}
          <button
            type="button"
            disabled={!continueTarget}
            onClick={() => {
              if (!continueTarget) return;
              onStartQuiz({
                exam: continueTarget.exam,
                section: continueTarget.section,
                missedOnly: false,
                limit: 20,
              });
            }}
            className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50 md:flex-col md:items-start md:justify-between md:gap-1.5 md:p-3.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-bold text-indigo-700 md:hidden">
              2
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.08em] text-slate-500 md:block">
              2 · CONTINUE
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:w-full">
              <span className="text-[15px] font-bold text-slate-900">
                {continueExamShort} {continueSecName}
              </span>
              <span className="text-[13px] text-slate-600">
                {continueTarget
                  ? continueTarget.secData.seen > 0
                    ? `Progress at ${continueTarget.secData.seen}/${continueTarget.secData.total} seen`
                    : `${continueTarget.secData.total} questions ready`
                  : "No questions available"}
              </span>
            </div>

            <ArrowRight
              className="h-4 w-4 shrink-0 text-slate-500 md:hidden"
              aria-hidden="true"
            />
            <span className="mt-1 hidden text-[13px] font-bold text-indigo-700 md:inline">
              Resume →
            </span>
          </button>

          {/* Step 3: Strengthen */}
          <button
            type="button"
            disabled={!weakestSection}
            onClick={() => {
              if (!weakestSection) return;
              onStartQuiz({
                exam: selectedExam,
                section: weakestSection.section,
                missedOnly: true,
                limit: 5,
              });
            }}
            className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50 md:flex-col md:items-start md:justify-between md:gap-1.5 md:p-3.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-bold text-indigo-700 md:hidden">
              3
            </span>
            <span className="hidden text-[11px] font-bold tracking-[0.08em] text-slate-500 md:block">
              3 · STRENGTHEN
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:w-full">
              <span className="text-[15px] font-bold text-slate-900">
                {examShortLabel} {weakName}
              </span>
              <span className="text-[13px] text-slate-600">
                {weakestSection && weakestSection.attempts > 0
                  ? `Lowest accuracy: ${weakestSection.accuracy}%`
                  : weakestSection
                    ? `${weakestSection.total} questions to practice`
                    : "All sections empty"}
              </span>
            </div>

            <ArrowRight
              className="h-4 w-4 shrink-0 text-slate-500 md:hidden"
              aria-hidden="true"
            />
            <span className="mt-1 hidden text-[13px] font-bold text-indigo-700 md:inline">
              Practice 5 →
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onStartSmartSession}
          disabled={snapshot.total === 0}
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[15px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          Start session · {smartSessionSize} questions
        </button>
      </section>

      {/* 3. Today's numbers (4 KPI cards) */}
      <section
        aria-label="Today's numbers"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <span className="text-[13px] font-semibold text-slate-500">
            Daily goal
          </span>
          <span className="text-[22px] leading-[1.1] font-bold text-slate-900 tabular-nums md:text-[26px]">
            {todayAnswered}/{dailyTarget}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {dailyRemaining > 0
              ? `${dailyRemaining} more today`
              : "Daily goal complete"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <span className="text-[13px] font-semibold text-slate-500">
            Streak
          </span>
          <span className="text-[22px] leading-[1.1] font-bold text-slate-900 tabular-nums md:text-[26px]">
            {streakDays} {streakDays === 1 ? "day" : "days"}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-orange-600 transition-all duration-500"
              style={{ width: streakDays > 0 ? "100%" : "0%" }}
            />
          </div>
          <span className="text-xs text-slate-500">
            Best: {bestStreakDays} {bestStreakDays === 1 ? "day" : "days"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <span className="text-[13px] font-semibold text-slate-500">
            Accuracy · {examShortLabel}
          </span>
          <span className="text-[22px] leading-[1.1] font-bold text-slate-900 tabular-nums md:text-[26px]">
            {snapshot.attempts > 0 ? `${snapshot.accuracyPct}%` : "—"}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
              style={{
                width: `${snapshot.attempts > 0 ? snapshot.accuracyPct : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {snapshot.correct}/{snapshot.attempts} answers
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <span className="text-[13px] font-semibold text-slate-500">
            Seen · {examShortLabel}
          </span>
          <span className="text-[22px] leading-[1.1] font-bold text-slate-900 tabular-nums md:text-[26px]">
            {snapshot.seen}/{snapshot.total}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${seenPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {Math.max(0, snapshot.total - snapshot.seen)} never seen
          </span>
        </div>
      </section>

      {/* 4. Last 7 days Chart + Weak areas */}
      <section className="flex flex-wrap gap-4 md:gap-5">
        {/* Left: Last 7 days */}
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:gap-4 md:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <button
              type="button"
              onClick={onOpenStats}
              className="m-0 cursor-pointer text-left text-[17px] font-bold text-slate-900 hover:text-indigo-700 md:text-lg"
            >
              Last 7 days
            </button>
            <span className="text-xs text-slate-500 md:text-[13px]">
              <span className="hidden md:inline">{weeklyTotal} questions · </span>
              target {dailyTarget}/day
            </span>
          </div>

          <div
            role="img"
            aria-label={`Last 7 days activity: ${weeklySeries
              .map((d) => `${d.dayLabel} ${d.answered}`)
              .join(", ")}`}
            className="relative flex h-[120px] items-end gap-2 border-b border-slate-200 pt-5 md:h-[140px] md:gap-3.5"
          >
            <div
              className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-slate-400"
              style={{ bottom: `${targetLineBottomPx}px` }}
            />
            <span
              className="pointer-events-none absolute right-0 text-[11px] font-medium text-slate-500"
              style={{ bottom: `${targetLineBottomPx + 4}px` }}
            >
              {dailyTarget}
            </span>

            {weeklySeries.map((day, idx) => {
              const isToday = idx === weeklySeries.length - 1;
              const barPx =
                day.answered > 0
                  ? Math.max(Math.round((day.answered / maxChartVal) * 96), 4)
                  : 2;
              const barColor =
                day.answered === 0
                  ? "bg-slate-200"
                  : isToday
                    ? "bg-indigo-700"
                    : "bg-indigo-300";
              return (
                <div
                  key={day.dateKey}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${day.dayLabel} (${day.dateKey}): ${day.answered} answered, ${day.correct} correct`}
                >
                  <span className="text-[11px] text-slate-600 tabular-nums">
                    {day.answered === 0 ? "—" : day.answered}
                  </span>
                  <div
                    className={`w-full max-w-[40px] rounded-t-md transition-all duration-300 ${barColor}`}
                    style={{ height: `${barPx}px` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 md:gap-3.5">
            {weeklySeries.map((day) => (
              <span
                key={day.dateKey}
                className="flex-1 text-center text-[11px] text-slate-500 md:text-xs"
              >
                <span className="md:hidden">{day.dayLabel.slice(0, 1)}</span>
                <span className="hidden md:inline">{day.dayLabel}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: Weak areas */}
        <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:gap-3.5 md:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-[17px] font-bold text-slate-900 md:text-lg">
              Weak areas · {examShortLabel}
            </h2>
            <span className="text-[13px] text-slate-500">accuracy</span>
          </div>

          <div className="flex flex-col gap-3">
            {orderedSections.map((sec, idx) => {
              const label = SECTION_LABELS[sec.section] ?? {
                name: sec.section,
                jp: "",
              };
              const isEmpty = sec.total === 0;
              const isWeakestAttempted = idx === 0 && sec.attempts > 0;
              const pct = sec.attempts > 0 ? sec.accuracy : 0;

              let note = "No questions yet";
              if (!isEmpty && sec.attempts === 0) {
                note = `Not practiced yet · ${sec.total} Qs`;
              } else if (sec.attempts > 0) {
                note = `${sec.correct}/${sec.attempts} right${
                  isWeakestAttempted ? " · weakest" : ""
                }`;
              }

              return (
                <div
                  key={sec.section}
                  className={`flex flex-col gap-1.5 ${isEmpty ? "opacity-50" : ""}`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-900">
                      {label.name}{" "}
                      <span className="font-normal text-slate-500">
                        {label.jp}
                      </span>
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {sec.attempts > 0 ? `${sec.accuracy}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{note}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!weakestSection}
            onClick={() => {
              if (!weakestSection) return;
              onStartQuiz({
                exam: selectedExam,
                section: weakestSection.section,
                missedOnly: false,
              });
            }}
            className="mt-auto inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Practice weakest · {weakName}
          </button>
        </div>
      </section>

      {/* 5. Quick practice */}
      <section
        aria-labelledby="quick-practice-heading"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:gap-3.5 md:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="quick-practice-heading"
            className="m-0 text-[17px] font-bold text-slate-900 md:text-lg"
          >
            Quick practice
          </h2>
          <button
            type="button"
            onClick={onOpenBank}
            className="cursor-pointer text-xs font-semibold text-indigo-700 hover:underline"
          >
            Browse {snapshot.total} Qs →
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {LEVEL_TABS.map((lvl) => {
            const count = examCounts[lvl.id] ?? 0;
            const active = selectedExam === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectExam(lvl.id)}
                className={`inline-flex h-11 min-w-[52px] cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition-colors md:px-4 ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="md:hidden">{lvl.shortLabel}</span>
                <span className="hidden md:inline">{lvl.label}</span>
                <span
                  className={`hidden text-[13px] font-normal md:inline ${
                    active ? "text-white/90" : "text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {snapshot.sections.map((sec) => {
            const label = SECTION_LABELS[sec.section] ?? {
              name: sec.section,
              jp: "",
            };
            const isEmpty = sec.total === 0;
            return (
              <button
                key={sec.section}
                type="button"
                disabled={isEmpty}
                onClick={() =>
                  onStartQuiz({
                    exam: selectedExam,
                    section: sec.section,
                    missedOnly: false,
                  })
                }
                className={`flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors md:px-3.5 ${
                  isEmpty
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                    : "cursor-pointer border-slate-300 bg-white text-slate-900 hover:border-indigo-400 hover:bg-indigo-50/40"
                }`}
              >
                <span className="text-sm font-bold">{label.name}</span>
                <span className="text-xs text-slate-500">
                  {isEmpty ? `Empty · ${label.jp}` : `${sec.total} · ${label.jp}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Profile & device backup */}
      <section
        id="profile"
        aria-labelledby="profile-heading"
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:gap-5 md:p-5"
      >
        <div className="flex flex-[1_1_220px] items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-800">
            {(profileName.trim()[0] || "A").toUpperCase()}
          </div>
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={32}
                  aria-label="Profile name"
                  className="h-8 w-36 rounded-lg border border-slate-300 px-2 text-sm font-semibold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-indigo-600 px-2.5 text-xs font-bold text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h2
                  id="profile-heading"
                  className="m-0 text-base font-bold text-slate-900"
                >
                  {profileName}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  aria-label="Edit display name"
                  className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onOpenStats}
              className="cursor-pointer text-left text-[13px] text-slate-500 hover:text-indigo-700"
            >
              Daily target {dailyTarget} · stored on this device
            </button>
          </div>
        </div>

        <div className="flex flex-[2_1_360px] flex-wrap gap-2">
          {[
            { id: "N2", label: "N2" },
            { id: "JFT", label: "JFT-Basic" },
            { id: "N1", label: "N1" },
          ].map((ex) => {
            const dateVal = examDates[ex.id];
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onSelectExam(ex.id);
                  setDraftDate(dateVal || "");
                  setEditingDate(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-slate-200 ${
                  dateVal
                    ? "bg-slate-100 font-medium text-slate-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {ex.label} · {dateVal ? formatShortDate(dateVal) : "no date set"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-slate-500">
            {mountedNow ? formatRelativeBackup(lastBackupAt, mountedNow) : "Local backup"}
          </span>
          <button
            type="button"
            onClick={onExportBackup}
            className="h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Export
          </button>
        </div>
      </section>
    </div>
  );
}
