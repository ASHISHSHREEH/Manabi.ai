"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildWeeklySeries,
  computeExamBreakdowns,
  computeLevelSnapshot,
  computeSummaryStats,
} from "@/lib/analytics";
import {
  clearProgress,
  DEFAULT_STUDY_STATE,
  exportBackupJson,
  importBackupJson,
  loadProgress,
  loadStudyState,
  recordQuestionResult,
  saveDailyTarget,
} from "@/lib/storage";
import type { ProgressMap, Question, UserStudyState } from "@/types/question";

/**
 * Manages client-side localStorage progress, daily targets, backups,
 * and derived exam/section analytics for the active exam level.
 */
export function useStudyState(questions: Question[], selectedExam: string) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [studyState, setStudyState] = useState<UserStudyState>(DEFAULT_STUDY_STATE);

  useEffect(() => {
    setProgress(loadProgress());
    setStudyState(loadStudyState());
  }, []);

  const summary = useMemo(
    () => computeSummaryStats(questions, progress, studyState.dailyActivity),
    [questions, progress, studyState.dailyActivity]
  );

  const levelSnapshot = useMemo(
    () => computeLevelSnapshot(questions, progress, selectedExam),
    [questions, progress, selectedExam]
  );

  const examBreakdowns = useMemo(
    () => computeExamBreakdowns(questions, progress),
    [questions, progress]
  );

  const allSectionBreakdowns = useMemo(
    () => computeLevelSnapshot(questions, progress, "ALL").sections,
    [questions, progress]
  );

  const weeklySeries = useMemo(
    () => buildWeeklySeries(studyState.dailyActivity),
    [studyState.dailyActivity]
  );

  function recordAnswer(questionId: string, isCorrect: boolean) {
    const res = recordQuestionResult(questionId, isCorrect);
    setProgress(res.progress);
    setStudyState(res.studyState);
  }

  function updateDailyTarget(target: number) {
    setStudyState(saveDailyTarget(target));
  }

  function exportBackup() {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manabi-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(rawJson: string) {
    const imported = importBackupJson(rawJson);
    setProgress(imported.progress);
    setStudyState(imported.studyState);
  }

  function resetAllProgress() {
    clearProgress();
    setProgress({});
    setStudyState(DEFAULT_STUDY_STATE);
  }

  return {
    progress,
    dailyTarget: studyState.dailyTarget,
    summary,
    levelSnapshot,
    examBreakdowns,
    allSectionBreakdowns,
    weeklySeries,
    recordAnswer,
    updateDailyTarget,
    exportBackup,
    importBackup,
    resetAllProgress,
  };
}
