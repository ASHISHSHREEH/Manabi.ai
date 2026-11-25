"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Flag,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import type { MockAttemptResult, MockGradedQuestionReview } from "@/types/question";

interface MockResultsProps {
  result: MockAttemptResult;
  onBackToLobby: () => void;
  onPracticeWeakestSection: (examCode: string, section: string) => void;
}

type ReviewFilter = "all" | "incorrect" | "flagged";

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}m ${rem}s`;
}

export function MockResults({
  result,
  onBackToLobby,
  onPracticeWeakestSection,
}: MockResultsProps) {
  const [filter, setFilter] = useState<ReviewFilter>("incorrect");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiContextQuestion, setAiContextQuestion] =
    useState<MockGradedQuestionReview | null>(null);

  const wrongQuestions = useMemo(
    () => result.questions.filter((q) => !q.is_correct),
    [result.questions]
  );

  const filteredQuestions = useMemo(() => {
    if (filter === "incorrect") return wrongQuestions;
    if (filter === "flagged") return result.questions.filter((q) => q.marked_for_review);
    return result.questions;
  }, [result.questions, wrongQuestions, filter]);

  const weakestSec = result.weak_sections[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToLobby}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mock Lobby
        </button>

        <span className="text-xs font-medium text-slate-500">
          Submitted {new Date(result.submitted_at).toLocaleString()}
        </span>
      </div>

      {/* Hero Score Banner */}
      <section
        className={`rounded-2xl border p-6 text-white shadow-sm ${
          result.passed
            ? "border-emerald-700 bg-gradient-to-br from-emerald-700 to-emerald-600"
            : "border-indigo-800 bg-gradient-to-br from-indigo-800 to-indigo-600"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide">
              {result.passed ? "PASSED THRESHOLD" : "NEEDS IMPROVEMENT"}
            </span>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {result.exam_name} ·{" "}
              {result.mode === "full" ? "Full Mock Result" : "Section Mock Result"}
            </h1>
            <p className="mt-1 text-sm text-white/85">{result.pass_rule_summary}</p>
          </div>

          <div className="flex items-baseline gap-6 rounded-2xl bg-white/15 px-5 py-3.5">
            <div>
              <div className="text-xs text-white/80">Scaled Score</div>
              <div className="text-3xl font-bold tabular-nums">
                {result.scaled_score}
                <span className="text-base font-medium text-white/80">
                  /{result.max_score}
                </span>
              </div>
            </div>
            <div className="h-10 w-px bg-white/25" />
            <div>
              <div className="text-xs text-white/80">Accuracy</div>
              <div className="text-3xl font-bold tabular-nums">
                {result.accuracy_pct}%
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-white/20 pt-3 text-xs text-white/90">
          <span>
            Correct: <strong>{result.raw_correct}/{result.raw_total}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Time spent: <strong>{formatDuration(result.total_time_sec)}</strong>
          </span>
          <span>
            Added to Mistake Bank: <strong>{wrongQuestions.length} items</strong>
          </span>
        </div>
      </section>

      {/* Section Accuracy + Manabi AI Coaching Preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900">Section Breakdown</h2>
          <div className="flex flex-col gap-3">
            {result.section_scores.map((sec) => (
              <div
                key={sec.section}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>{sec.label}</span>
                    {sec.min_scaled_score != null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          sec.section_passed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {sec.scaled_score}/{sec.max_scaled_score} (min {sec.min_scaled_score})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {sec.correct}/{sec.total} ({sec.accuracy_pct}%)
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${
                      sec.accuracy_pct >= 70 ? "bg-emerald-600" : "bg-indigo-600"
                    }`}
                    style={{ width: `${sec.accuracy_pct}%` }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  Time in section: {formatDuration(sec.time_spent_sec)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System 2 Readiness: Coach Recommendations from Real Score */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold">Manabi AI Coach Summary</h2>
          </div>
          <p className="text-sm text-slate-700">
            You scored <strong>{result.accuracy_pct}%</strong> on {result.exam_name}.{" "}
            {result.weak_sections.length > 0 ? (
              <>
                Focus first on{" "}
                <strong className="capitalize">
                  {result.weak_sections.join(" and ")}
                </strong>
                .
              </>
            ) : (
              "Strong coverage across all tested sections!"
            )}
          </p>

          {result.weak_topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.weak_topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          <ul className="mt-1 space-y-2 text-xs text-slate-700">
            {wrongQuestions.length > 0 && (
              <li className="flex items-start gap-2">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span>
                  Review {wrongQuestions.length} incorrect answer
                  {wrongQuestions.length === 1 ? "" : "s"} below and tap{" "}
                  <strong>Ask Manabi AI</strong> for targeted breakdown.
                </span>
              </li>
            )}
            {weakestSec && (
              <li className="flex items-start gap-2">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span>
                  Drill 10 targeted{" "}
                  <strong className="capitalize">{weakestSec}</strong> questions in Practice Mode.
                </span>
              </li>
            )}
          </ul>

          {weakestSec && (
            <button
              type="button"
              onClick={() =>
                onPracticeWeakestSection(result.exam_code, weakestSec)
              }
              className="mt-auto inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Drill Weakest · {weakestSec}
            </button>
          )}
        </aside>
      </div>

      {/* Filterable Question Review */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Answer Review</h2>
          <div className="flex gap-1.5">
            {[
              { id: "incorrect", label: `Incorrect (${wrongQuestions.length})` },
              {
                id: "flagged",
                label: `Flagged (${result.questions.filter((q) => q.marked_for_review).length})`,
              },
              { id: "all", label: `All (${result.questions.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id as ReviewFilter)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold ${
                  filter === t.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
            No questions match this filter.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredQuestions.map((q) => {
              const isOpen = expandedId === q.question_id;
              return (
                <div
                  key={q.question_id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isOpen ? null : q.question_id)
                      }
                      className="flex flex-1 cursor-pointer items-start gap-2.5 text-left"
                    >
                      {q.is_correct ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                          <span>Q{q.index + 1}</span>
                          <span className="capitalize">{q.section}</span>
                          {q.marked_for_review && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                              <Flag className="h-2.5 w-2.5" /> Flagged
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {q.prompt}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiContextQuestion(q)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Ask Manabi AI
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                      {q.options.map((opt, idx) => {
                        const isPicked = opt.id === q.selected_option_id;
                        const isRight = opt.is_correct;
                        return (
                          <div
                            key={opt.id}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              isRight
                                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                                : isPicked
                                  ? "border-rose-300 bg-rose-50 text-rose-950"
                                  : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <div className="font-semibold">
                              {idx + 1}. {opt.text}
                              {isRight && " ✓ Correct"}
                              {isPicked && !isRight && " ✗ Your choice"}
                            </div>
                            {opt.explanation && (
                              <div className="mt-1 text-slate-600">{opt.explanation}</div>
                            )}
                          </div>
                        );
                      })}
                      {q.explanation && (
                        <div className="rounded-lg bg-white p-3 text-xs text-slate-700">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ask Manabi AI Context Handoff Preview (System 2 hook) */}
      {aiContextQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900">
                <Bot className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold">
                  Manabi AI Context Attached (System 2 Ready)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAiContextQuestion(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              When System 2 AI Tutor is connected, clicking <strong>Ask Manabi AI</strong> sends this exact question &amp; answer payload automatically so you never have to copy-paste:
            </p>

            <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-slate-900 p-3.5 text-[11px] text-slate-100">
              {JSON.stringify(
                {
                  mode: "exam_help",
                  attempt_id: result.attempt_id,
                  question_id: aiContextQuestion.question_id,
                  exam: aiContextQuestion.exam_code,
                  section: aiContextQuestion.section,
                  topic_tag: aiContextQuestion.topic_tag,
                  prompt: aiContextQuestion.prompt,
                  student_choice:
                    aiContextQuestion.options.find(
                      (o) => o.id === aiContextQuestion.selected_option_id
                    )?.text ?? "Unanswered",
                  correct_choice:
                    aiContextQuestion.options.find((o) => o.is_correct)?.text ?? "",
                  explanation: aiContextQuestion.explanation,
                },
                null,
                2
              )}
            </pre>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAiContextQuestion(null)}
                className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
