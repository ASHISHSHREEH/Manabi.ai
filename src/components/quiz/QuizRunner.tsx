"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  prepareSessionQuestions,
  shuffleQuestionChoices,
  stripChoiceLabel,
  type SessionQuestion,
} from "@/lib/quiz";
import type { ProgressMap, Question } from "@/types/question";
import { Card } from "@/components/ui/Card";

interface QuizRunnerProps {
  sourceQuestions: Question[];
  sessionKey: number;
  progress: ProgressMap;
  backLabel: string;
  onBack: () => void;
  onRecordAnswer: (questionId: string, isCorrect: boolean) => void;
}

export function QuizRunner({
  sourceQuestions,
  sessionKey,
  progress,
  backLabel,
  onBack,
  onRecordAnswer,
}: QuizRunnerProps) {
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setSessionQuestions(prepareSessionQuestions(sourceQuestions));
    setSessionAnswers({});
    setCurrentIndex(0);
    setDone(false);
  }, [sourceQuestions, sessionKey]);

  const currentSessionItem = sessionQuestions[currentIndex];
  const currentQuestion = currentSessionItem?.question;
  const selectedChoiceIndex = sessionAnswers[currentIndex] ?? null;
  const hasAnswered = selectedChoiceIndex !== null;

  const isCorrectSelection =
    hasAnswered &&
    Boolean(currentSessionItem?.choices[selectedChoiceIndex]?.isCorrect);

  const correctAnswerDisplay = useMemo(() => {
    if (!currentSessionItem) return "";
    const right = currentSessionItem.choices.find((c) => c.isCorrect);
    return right?.displayText ?? stripChoiceLabel(currentSessionItem.question.answer);
  }, [currentSessionItem]);

  const sessionCorrect = useMemo(() => {
    return sessionQuestions.reduce((count, item, idx) => {
      const picked = sessionAnswers[idx];
      if (picked === undefined) return count;
      return count + (item.choices[picked]?.isCorrect ? 1 : 0);
    }, 0);
  }, [sessionQuestions, sessionAnswers]);

  function handleSelectChoice(idx: number) {
    if (!currentSessionItem || hasAnswered) return;
    const correct = Boolean(currentSessionItem.choices[idx]?.isCorrect);

    setSessionAnswers((prev) => ({
      ...prev,
      [currentIndex]: idx,
    }));

    onRecordAnswer(currentSessionItem.question.id, correct);
  }

  function handlePrevious() {
    if (currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
  }

  function handleNext() {
    if (!hasAnswered) return;
    if (currentIndex + 1 >= sessionQuestions.length) {
      setDone(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }

  function handleReshuffle() {
    setSessionQuestions(prepareSessionQuestions(sourceQuestions));
    setSessionAnswers({});
    setCurrentIndex(0);
    setDone(false);
  }

  function handleRetryQuestion() {
    if (!currentQuestion) return;
    setSessionQuestions((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? shuffleQuestionChoices(item.question) : item
      )
    );
    setSessionAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  }

  if (sessionQuestions.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-sm text-slate-600">No questions in this selection.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </button>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </button>

        {!done && currentQuestion && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
              {currentQuestion.exam}
            </span>
            <span className="rounded-md bg-slate-200/80 px-2 py-0.5 capitalize text-slate-700">
              {currentQuestion.section}
            </span>
            <span className="hidden text-slate-400 sm:inline">
              {currentQuestion.id}
            </span>
            <span className="ml-1 font-bold text-slate-700">
              {currentIndex + 1} / {sessionQuestions.length}
            </span>
          </div>
        )}
      </div>

      {!done && currentQuestion && currentSessionItem && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="whitespace-pre-wrap text-base leading-relaxed font-medium text-slate-900 sm:text-lg">
              {currentQuestion.question}
            </p>
            {progress[currentQuestion.id] && (
              <p className="mt-3 text-xs text-slate-400">
                Seen {progress[currentQuestion.id].times_seen}x · Right{" "}
                {progress[currentQuestion.id].times_correct}x · Last:{" "}
                {progress[currentQuestion.id].last_seen}
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-2.5">
            {currentSessionItem.choices.map((choice, idx) => {
              const isSelected = selectedChoiceIndex === idx;

              let style =
                "border-slate-200 bg-white text-slate-900 hover:border-indigo-300 active:bg-slate-50";
              if (hasAnswered) {
                if (choice.isCorrect) {
                  style = "border-emerald-500 bg-emerald-50 text-emerald-950";
                } else if (isSelected) {
                  style = "border-rose-500 bg-rose-50 text-rose-950";
                } else {
                  style = "border-slate-200 bg-slate-50 text-slate-400";
                }
              }

              return (
                <button
                  key={`${currentQuestion.id}-${choice.originalIndex}`}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => handleSelectChoice(idx)}
                  className={`flex min-h-12 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition sm:text-base ${style}`}
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs opacity-70">
                    {idx + 1}
                  </span>
                  <span>{choice.displayText}</span>
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                isCorrectSelection
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-rose-200 bg-rose-50 text-rose-950"
              }`}
            >
              <p className="font-bold">
                {isCorrectSelection
                  ? "Correct!"
                  : `Wrong — Answer: ${correctAnswerDisplay}`}
              </p>

              {currentQuestion.explanation && (
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              )}

              {currentSessionItem.choices.some((c) => c.explanation) && (
                <div className="mt-3.5 border-t border-current/15 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-75">
                    All Options (English Breakdown)
                  </p>
                  <ul className="mt-2 space-y-2">
                    {currentSessionItem.choices.map((choice, idx) => {
                      const isUserWrongPick =
                        !choice.isCorrect && selectedChoiceIndex === idx;
                      const itemStyle = choice.isCorrect
                        ? "border-emerald-300/80 bg-white/90 text-slate-900"
                        : isUserWrongPick
                          ? "border-rose-300/80 bg-white/90 text-slate-900"
                          : "border-slate-200/80 bg-white/75 text-slate-800";
                      const tagStyle = choice.isCorrect
                        ? "bg-emerald-100 text-emerald-800"
                        : isUserWrongPick
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-600";
                      const tagLabel = choice.isCorrect
                        ? "Correct"
                        : isUserWrongPick
                          ? "Your pick · Wrong"
                          : "Wrong";

                      return (
                        <li
                          key={`breakdown-${currentQuestion.id}-${choice.originalIndex}`}
                          className={`rounded-xl border px-3 py-2 text-xs leading-relaxed sm:text-sm ${itemStyle}`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-600">
                              {idx + 1}
                            </span>
                            <span>{choice.displayText}</span>
                            <span
                              className={`ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tagStyle}`}
                            >
                              {tagLabel}
                            </span>
                          </div>
                          {choice.explanation && (
                            <p className="mt-1 pl-6 text-slate-600">
                              {choice.explanation}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {currentQuestion.my_wrong_answer && (
                <p className="mt-2 text-xs opacity-80">
                  Original mistake logged: {currentQuestion.my_wrong_answer}
                </p>
              )}

              {currentQuestion.source && (
                <p className="mt-1 text-xs opacity-75">
                  Source: {currentQuestion.source}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            >
              &larr; Previous
            </button>
            <button
              type="button"
              disabled={!hasAnswered}
              onClick={handleRetryQuestion}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:px-4 sm:text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              Retry
            </button>
            <button
              type="button"
              disabled={!hasAnswered}
              onClick={handleNext}
              className="min-h-12 flex-[1.4] rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-4 sm:text-sm"
            >
              {currentIndex + 1 >= sessionQuestions.length
                ? "Finish"
                : "Next \u2192"}
            </button>
          </div>
        </div>
      )}

      {done && (
        <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Session Complete
          </p>
          <p className="text-4xl font-bold text-slate-900">
            {sessionCorrect} / {sessionQuestions.length}
          </p>
          <p className="text-sm text-slate-600">
            {sessionQuestions.length > 0
              ? `${Math.round((sessionCorrect / sessionQuestions.length) * 100)}% accuracy`
              : ""}
          </p>

          <div className="mt-2 flex w-full max-w-xs flex-col gap-2.5">
            <button
              type="button"
              onClick={handleReshuffle}
              className="min-h-12 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Review Again (Reshuffled)
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {backLabel}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
