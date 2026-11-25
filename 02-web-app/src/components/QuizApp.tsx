"use client";

import { useState } from "react";
import { LevelSwitcher } from "@/components/hub/LevelSwitcher";
import { QuestionBankView } from "@/components/hub/QuestionBankView";
import { StudyHub } from "@/components/hub/StudyHub";
import { MobileBottomNav, TopNav } from "@/components/layout/TopNav";
import { MockExamView } from "@/components/mock/MockExamView";
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
    profileName,
    examDates,
    lastBackupAt,
    lastSession,
    bestStreakDays,
    summary,
    levelSnapshot,
    examBreakdowns,
    allSectionBreakdowns,
    weeklySeries,
    recordAnswer,
    updateDailyTarget,
    updateProfileName,
    updateExamDate,
    recordLastSession,
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
    limit?: number;
  }) {
    if (opts.section !== "ALL") {
      recordLastSession(opts.exam, opts.section);
    }
    const base = filterQuestions(questions, opts.exam, opts.section);
    const filtered = opts.missedOnly
      ? base.filter((q) => !progress[q.id]?.last_correct)
      : base;
    const pool = filtered.length > 0 ? filtered : base;
    const list = opts.limit ? pool.slice(0, opts.limit) : pool;
    launchQuiz(list, "hub");
  }

  /** Build a prioritized 20-question smart session (wrong -> unseen -> remaining). */
  function handleStartSmartSession() {
    const scoped = filterQuestions(questions, selectedExam, "ALL");
    const wrong = scoped.filter((q) => {
      const r = progress[q.id];
      return r && r.times_seen > 0 && !r.last_correct;
    });
    const unseen = scoped.filter((q) => !progress[q.id]?.times_seen);
    const rest = scoped.filter((q) => progress[q.id]?.last_correct);
    const combined = [...wrong, ...unseen, ...rest].slice(0, 20);
    launchQuiz(combined.length > 0 ? combined : scoped.slice(0, 20), "hub");
  }

  function handleOpenProfile() {
    setActiveView("hub");
    requestAnimationFrame(() => {
      document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  const wrongCount = filterQuestions(questions, selectedExam, "ALL").filter(
    (q) => {
      const r = progress[q.id];
      return r && r.times_seen > 0 && !r.last_correct;
    }
  ).length;

  const showLevelSwitcher = activeView === "bank";

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip bg-slate-50">
      <TopNav
        activeView={activeView}
        streakDays={summary.streakDays}
        profileName={profileName}
        onSelectView={setActiveView}
        onStartPractice={handleStartSmartSession}
        onExportBackup={exportBackup}
        onOpenProfile={handleOpenProfile}
      />

      {showLevelSwitcher && (
        <LevelSwitcher
          questions={questions}
          selectedExam={selectedExam}
          onSelectExam={setSelectedExam}
        />
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-8 md:px-6 md:py-8 md:pb-12">
        {activeView === "hub" && (
          <StudyHub
            questions={questions}
            selectedExam={selectedExam}
            onSelectExam={setSelectedExam}
            snapshot={levelSnapshot}
            wrongCount={wrongCount}
            todayAnswered={summary.todayAnswered}
            dailyTarget={dailyTarget}
            streakDays={summary.streakDays}
            bestStreakDays={bestStreakDays}
            weeklySeries={weeklySeries}
            profileName={profileName}
            examDates={examDates}
            lastBackupAt={lastBackupAt}
            lastSession={lastSession}
            onUpdateProfileName={updateProfileName}
            onUpdateExamDate={updateExamDate}
            onExportBackup={exportBackup}
            onStartSmartSession={handleStartSmartSession}
            onStartQuiz={handleStartQuizFromHub}
            onOpenBank={() => setActiveView("bank")}
            onOpenStats={() => setActiveView("stats")}
            onOpenMock={() => setActiveView("mock")}
          />
        )}

        {activeView === "mock" && (
          <MockExamView
            questions={questions}
            initialExamCode={selectedExam}
            onSyncAnswerToLocalProgress={recordAnswer}
            onPracticeWeakestSection={(examCode, section) => {
              setSelectedExam(examCode);
              handleStartQuizFromHub({
                exam: examCode,
                section,
                missedOnly: false,
                limit: 10,
              });
            }}
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

      {activeView !== "quiz" && (
        <MobileBottomNav
          activeView={activeView}
          onSelectView={setActiveView}
          onStartPractice={handleStartSmartSession}
        />
      )}
    </div>
  );
}
