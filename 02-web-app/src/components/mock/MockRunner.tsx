"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Flag,
  Grid,
  Send,
  X,
} from "lucide-react";
import type { MockAttemptState } from "@/types/question";

interface MockRunnerProps {
  attempt: MockAttemptState;
  submitting: boolean;
  onUpdateAnswer: (opts: {
    questionId: string;
    selectedOptionId: string | null;
    markedForReview: boolean;
    timeSpentSec: number;
  }) => Promise<void>;
  onSubmitExam: (totalTimeSec: number) => Promise<void>;
  onExitAttempt: () => void;
}

type NavFilter = "all" | "unanswered" | "flagged";

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
}

export function MockRunner({
  attempt,
  submitting,
  onUpdateAnswer,
  onSubmitExam,
  onExitAttempt,
}: MockRunnerProps) {
  const [questions, setQuestions] = useState(attempt.questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(attempt.remaining_sec);
  const [navFilter, setNavFilter] = useState<NavFilter>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Auto-save ready");

  const questionStartMsRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);

  // Sync timer countdown every second; auto-submit cleanly at 00:00
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            void onSubmitExam(attempt.duration_sec);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt.duration_sec, onSubmitExam]);

  const currentQ = questions[currentIndex];
  const answeredCount = useMemo(
    () => questions.filter((q) => q.selected_option_id !== null).length,
    [questions]
  );
  const flaggedCount = useMemo(
    () => questions.filter((q) => q.marked_for_review).length,
    [questions]
  );
  const unansweredCount = questions.length - answeredCount;

  const filteredIndexes = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (navFilter === "unanswered") return q.selected_option_id === null;
        if (navFilter === "flagged") return q.marked_for_review;
        return true;
      });
  }, [questions, navFilter]);

  function getCumulativeQuestionSec(idx: number): number {
    const base = questions[idx]?.time_spent_sec ?? 0;
    const delta = Math.max(0, Math.round((Date.now() - questionStartMsRef.current) / 1000));
    return base + delta;
  }

  function jumpToQuestion(nextIdx: number) {
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    if (nextIdx !== currentIndex && currentQ) {
      const totalSec = getCumulativeQuestionSec(currentIndex);
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === currentIndex ? { ...q, time_spent_sec: totalSec } : q
        )
      );
      void onUpdateAnswer({
        questionId: currentQ.question_id,
        selectedOptionId: currentQ.selected_option_id,
        markedForReview: currentQ.marked_for_review,
        timeSpentSec: totalSec,
      });
    }
    questionStartMsRef.current = Date.now();
    setCurrentIndex(nextIdx);
    setMobileNavOpen(false);
  }

  async function persistCurrentChange(
    nextOptionId: string | null,
    nextFlagged: boolean
  ) {
    if (!currentQ) return;
    const totalSec = getCumulativeQuestionSec(currentIndex);
    questionStartMsRef.current = Date.now();

    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex
          ? {
              ...q,
              selected_option_id: nextOptionId,
              marked_for_review: nextFlagged,
              time_spent_sec: totalSec,
            }
          : q
      )
    );
    setSaveLabel("Saving...");
    await onUpdateAnswer({
      questionId: currentQ.question_id,
      selectedOptionId: nextOptionId,
      markedForReview: nextFlagged,
      timeSpentSec: totalSec,
    });
    setSaveLabel("Saved");
  }

  async function handleConfirmSubmit() {
    setConfirmOpen(false);
    const totalTimeSec = Math.max(0, attempt.duration_sec - remainingSec);
    await onSubmitExam(totalTimeSec);
  }

  if (!currentQ) return null;

  const timerUrgent = remainingSec <= 60;
  const timerWarning = remainingSec <= 300 && !timerUrgent;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Sticky Exam Bar */}
      <div className="sticky top-[52px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitAttempt}
            className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Exit
          </button>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {attempt.exam_name} · {attempt.mode === "full" ? "Full Mock" : `${attempt.section_filter ?? ""} Mock`}
            </div>
            <div className="text-[11px] text-slate-500">
              {answeredCount}/{questions.length} answered · {saveLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold tabular-nums ${
              timerUrgent
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : timerWarning
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-slate-50 text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{formatTimer(remainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 lg:hidden"
          >
            <Grid className="h-4 w-4" aria-hidden="true" />
            Grid
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {submitting ? "Grading..." : "Submit Exam"}
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left 2 Cols: Question Card */}
        <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 tabular-nums">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                {currentQ.section}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                void persistCurrentChange(
                  currentQ.selected_option_id,
                  !currentQ.marked_for_review
                )
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                currentQ.marked_for_review
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              {currentQ.marked_for_review ? "Marked for Review" : "Mark for Review"}
            </button>
          </div>

          <p className="whitespace-pre-line text-base leading-relaxed font-medium text-slate-900 md:text-lg">
            {currentQ.prompt}
          </p>

          <div className="flex flex-col gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const selected = currentQ.selected_option_id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    void persistCurrentChange(opt.id, currentQ.marked_for_review)
                  }
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    selected
                      ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[15px] font-medium text-slate-900">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => jumpToQuestion(currentIndex - 1)}
                className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {currentQ.selected_option_id !== null && (
                <button
                  type="button"
                  onClick={() =>
                    void persistCurrentChange(null, currentQ.marked_for_review)
                  }
                  className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {currentIndex + 1 < questions.length ? (
              <button
                type="button"
                onClick={() => jumpToQuestion(currentIndex + 1)}
                className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
              >
                <Send className="h-3.5 w-3.5" />
                Review &amp; Submit
              </button>
            )}
          </div>
        </section>

        {/* Right Col: Question Navigator Grid */}
        <aside
          className={`${
            mobileNavOpen ? "flex" : "hidden lg:flex"
          } flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Question Navigator</h2>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: `All (${questions.length})` },
              { id: "unanswered", label: `Unanswered (${unansweredCount})` },
              { id: "flagged", label: `Flagged (${flaggedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNavFilter(tab.id as NavFilter)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  navFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {filteredIndexes.map(({ q, idx }) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = q.selected_option_id !== null;
              const isFlagged = q.marked_for_review;

              return (
                <button
                  key={q.question_id}
                  type="button"
                  onClick={() => jumpToQuestion(idx)}
                  className={`relative flex h-10 cursor-pointer items-center justify-center rounded-xl border text-xs font-bold tabular-nums transition-colors ${
                    isCurrent
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-600"
                      : isAnswered
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-indigo-600" />
              Answered
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
              Unanswered
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Marked for review
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border-2 border-indigo-600 bg-indigo-50" />
              Current
            </div>
          </div>
        </aside>
      </div>

      {/* Screen C: Pre-Submit Confirmation Modal */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-bold">Submit Mock Examination?</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Once submitted, your answers are locked and graded into your Mistake Bank and performance history.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
              <div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">{answeredCount}</div>
                <div className="text-[11px] font-medium text-slate-500">Answered</div>
              </div>
              <div>
                <div className="text-lg font-bold text-rose-600 tabular-nums">{unansweredCount}</div>
                <div className="text-[11px] font-medium text-slate-500">Unanswered</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600 tabular-nums">{flaggedCount}</div>
                <div className="text-[11px] font-medium text-slate-500">Flagged</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {unansweredCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstIdx = questions.findIndex(
                      (q) => q.selected_option_id === null
                    );
                    setConfirmOpen(false);
                    if (firstIdx >= 0) jumpToQuestion(firstIdx);
                  }}
                  className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Review Unanswered
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="cursor-pointer rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleConfirmSubmit()}
                className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm & Grade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
