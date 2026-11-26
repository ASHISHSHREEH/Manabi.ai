"use client";

import { useEffect, useState } from "react";
import {
  fetchAttemptResults,
  fetchExamCatalog,
  fetchMockHistory,
  saveMockAnswer,
  startMockAttempt,
  submitMockAttempt,
  type MockBackendMode,
} from "@/lib/mockApi";
import type {
  ExamCatalogItem,
  MockAttemptHistoryItem,
  MockAttemptResult,
  MockAttemptState,
  Question,
} from "@/types/question";
import { MockLobby } from "@/components/mock/MockLobby";
import { MockResults } from "@/components/mock/MockResults";
import { MockRunner } from "@/components/mock/MockRunner";

interface MockExamViewProps {
  questions: Question[];
  initialExamCode: string;
  onSyncAnswerToLocalProgress: (questionId: string, isCorrect: boolean) => void;
  onPracticeWeakestSection: (examCode: string, section: string) => void;
}

export function MockExamView({
  questions,
  initialExamCode,
  onSyncAnswerToLocalProgress,
  onPracticeWeakestSection,
}: MockExamViewProps) {
  const [backendMode, setBackendMode] = useState<MockBackendMode>("local");
  const [exams, setExams] = useState<ExamCatalogItem[]>([]);
  const [history, setHistory] = useState<MockAttemptHistoryItem[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<MockAttemptState | null>(null);
  const [activeResult, setActiveResult] = useState<MockAttemptResult | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function refreshLobbyData() {
    const [catalogRes, historyRes] = await Promise.all([
      fetchExamCatalog(questions),
      fetchMockHistory(),
    ]);
    setBackendMode(catalogRes.mode);
    setExams(catalogRes.exams);
    setHistory(historyRes.history);
  }

  useEffect(() => {
    void refreshLobbyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  async function handleStartMock(opts: {
    examCode: string;
    mode: "full" | "section";
    section?: string;
    questionLimit?: number;
  }) {
    setErrorMessage("");
    setLoadingStart(true);
    try {
      const { backend, attempt } = await startMockAttempt(
        {
          exam_code: opts.examCode,
          mode: opts.mode,
          section: opts.section,
          question_limit: opts.questionLimit,
        },
        questions
      );
      setBackendMode(backend);
      setActiveResult(null);
      setActiveAttempt(attempt);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start mock exam."
      );
    } finally {
      setLoadingStart(false);
    }
  }

  async function handleUpdateAnswer(opts: {
    questionId: string;
    selectedOptionId: string | null;
    markedForReview: boolean;
    timeSpentSec: number;
  }) {
    if (!activeAttempt) return;
    setActiveAttempt((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) =>
              q.question_id === opts.questionId
                ? {
                    ...q,
                    selected_option_id: opts.selectedOptionId,
                    marked_for_review: opts.markedForReview,
                    time_spent_sec: opts.timeSpentSec,
                  }
                : q
            ),
          }
        : null
    );
    await saveMockAnswer(backendMode, activeAttempt.id, opts.questionId, {
      selected_option_id: opts.selectedOptionId,
      marked_for_review: opts.markedForReview,
      time_spent_sec: opts.timeSpentSec,
    });
  }

  async function handleSubmitExam(totalTimeSec: number) {
    if (!activeAttempt || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const result = await submitMockAttempt(
        backendMode,
        activeAttempt,
        totalTimeSec
      );
      for (const q of result.questions) {
        onSyncAnswerToLocalProgress(q.question_id, q.is_correct);
      }
      setActiveAttempt(null);
      setActiveResult(result);
      void refreshLobbyData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit mock exam."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenHistoryResult(attemptId: string) {
    setErrorMessage("");
    const res = await fetchAttemptResults(backendMode, attemptId);
    if (res) {
      setActiveAttempt(null);
      setActiveResult(res);
    } else {
      setErrorMessage("Could not load that result. Please try again.");
    }
  }

  if (activeAttempt) {
    return (
      <MockRunner
        attempt={activeAttempt}
        submitting={submitting}
        errorMessage={errorMessage}
        onUpdateAnswer={handleUpdateAnswer}
        onSubmitExam={handleSubmitExam}
        onExitAttempt={() => setActiveAttempt(null)}
      />
    );
  }

  if (activeResult) {
    return (
      <MockResults
        result={activeResult}
        onBackToLobby={() => setActiveResult(null)}
        onPracticeWeakestSection={onPracticeWeakestSection}
      />
    );
  }

  return (
    <MockLobby
      exams={exams}
      backendMode={backendMode}
      history={history}
      initialExamCode={initialExamCode === "ALL" ? "JFT" : initialExamCode}
      loadingStart={loadingStart}
      errorMessage={errorMessage}
      onStartMock={handleStartMock}
      onOpenHistoryResult={handleOpenHistoryResult}
    />
  );
}
