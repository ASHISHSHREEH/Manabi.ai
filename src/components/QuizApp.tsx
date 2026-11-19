"use client";

import { useState } from "react";
import { LevelSwitcher } from "@/components/hub/LevelSwitcher";
import { QuestionBankView } from "@/components/hub/QuestionBankView";
import { StudyHub } from "@/components/hub/StudyHub";
import { TopNav } from "@/components/layout/TopNav";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { StatsView } from "@/components/stats/StatsView";
import { useStudyState } from "@/hooks/useStudyState";
import { filterQuestions } from "@/lib/quiz";
import type { AppView, Question } from "@/types/question";

interface QuizAppProps {
  questions: Question[];
}

export default function QuizApp({ questions }: QuizAppProps) {
  const [activeView, setActiveView] = useState<AppView>("hub");
  const [selectedExam, setSelectedExam] = useState<string>("N2");
  const [returnView, setReturnView] = useState<"hub" | "bank">("hub");
  const [quizSessionQuestions, setQuizSessionQuestions] = useState<Question[]>([]);
  const [sessionKey, setSessionKey] = useState(0);

  const {
    progress,
    dailyTarget,
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
  } = useStudyState(questions, selectedExam);

  function launchQuiz(list: Question[], origin: "hub" | "bank") {
    setQuizSessionQuestions(list);
    setSessionKey((k) => k + 1);
    setReturnView(origin);
    setActiveView("quiz");
  }

  function handleStartQuizFromHub(opts: {
    exam: string;
    section: string;
    missedOnly: boolean;
  }) {
    const base = filterQuestions(questions, opts.exam, opts.section);
    const list = opts.missedOnly
      ? base.filter((q) => !progress[q.id]?.last_correct)
      : base;
    launchQuiz(list, "hub");
  }

  const showLevelSwitcher = activeView === "hub" || activeView === "bank";

  return (
    <div className="min-h-dvh w-full overflow-x-clip bg-slate-50">
      <TopNav
        activeView={activeView}
        onSelectView={setActiveView}
        streakDays={summary.streakDays}
        todayAnswered={summary.todayAnswered}
        dailyTarget={dailyTarget}
      />

      {showLevelSwitcher && (
        <LevelSwitcher
          questions={questions}
          selectedExam={selectedExam}
          onSelectExam={setSelectedExam}
        />
      )}

      <main className="mx-auto w-full max-w-5xl p-3 sm:p-6">
        {activeView === "hub" && (
          <StudyHub
            snapshot={levelSnapshot}
            todayAnswered={summary.todayAnswered}
            dailyTarget={dailyTarget}
            onStartQuiz={handleStartQuizFromHub}
            onOpenBank={() => setActiveView("bank")}
          />
        )}

        {activeView === "bank" && (
          <QuestionBankView
            questions={questions}
            progress={progress}
            selectedExam={selectedExam}
            onPracticeQuestion={(q) => launchQuiz([q], "bank")}
            onPracticeList={(list) => launchQuiz(list, "bank")}
          />
        )}

        {activeView === "quiz" && (
          <QuizRunner
            sourceQuestions={quizSessionQuestions}
            sessionKey={sessionKey}
            progress={progress}
            backLabel={
              returnView === "bank"
                ? "Back to Questions"
                : `Back to ${selectedExam === "ALL" ? "Study" : selectedExam} Hub`
            }
            onBack={() => setActiveView(returnView)}
            onRecordAnswer={recordAnswer}
          />
        )}

        {activeView === "stats" && (
          <StatsView
            totalQuestions={summary.totalQuestions}
            totalAttempts={summary.totalAttempts}
            uniqueSeen={summary.uniqueSeen}
            accuracyPct={summary.accuracyPct}
            streakDays={summary.streakDays}
            dailyTarget={dailyTarget}
            exams={examBreakdowns}
            sections={allSectionBreakdowns}
            weeklySeries={weeklySeries}
            onUpdateDailyTarget={updateDailyTarget}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
            onResetProgress={resetAllProgress}
          />
        )}
      </main>
    </div>
  );
}
