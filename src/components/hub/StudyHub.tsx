"use client";

import {
  ArrowRight,
  BookOpen,
  FileText,
  Headphones,
  Languages,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { LevelSnapshot } from "@/lib/analytics";

interface StudyHubProps {
  snapshot: LevelSnapshot;
  todayAnswered: number;
  dailyTarget: number;
  onStartQuiz: (opts: { exam: string; section: string; missedOnly: boolean }) => void;
  onOpenBank: () => void;
}

const LEVEL_META: Record<
  string,
  { title: string; subtitle: string; bannerBg: string; btnBg: string }
> = {
  ALL: {
    title: "All Exams Combined",
    subtitle: "JFT-Basic, JLPT N4, N3, N2, and N1",
    bannerBg: "from-slate-900 to-slate-800 text-white",
    btnBg: "bg-white text-slate-900 hover:bg-slate-100",
  },
  JFT: {
    title: "JFT-Basic (A2)",
    subtitle: "Everyday Japanese & sample test mistakes",
    bannerBg: "from-sky-700 to-sky-600 text-white",
    btnBg: "bg-white text-sky-900 hover:bg-sky-50",
  },
  N4: {
    title: "JLPT N4",
    subtitle: "Elementary Kanji, Vocab, Grammar & Reading",
    bannerBg: "from-amber-600 to-amber-500 text-white",
    btnBg: "bg-white text-amber-900 hover:bg-amber-50",
  },
  N3: {
    title: "JLPT N3",
    subtitle: "Intermediate Kanji, Vocab, Grammar & Reading",
    bannerBg: "from-emerald-700 to-emerald-600 text-white",
    btnBg: "bg-white text-emerald-900 hover:bg-emerald-50",
  },
  N2: {
    title: "JLPT N2 (Main Target)",
    subtitle: "Upper-intermediate exam prep",
    bannerBg: "from-indigo-700 to-indigo-600 text-white",
    btnBg: "bg-white text-indigo-900 hover:bg-indigo-50",
  },
  N1: {
    title: "JLPT N1",
    subtitle: "Advanced Kanji, Vocab, Grammar & Reading",
    bannerBg: "from-rose-700 to-rose-600 text-white",
    btnBg: "bg-white text-rose-900 hover:bg-rose-50",
  },
};

const SECTION_META: Record<
  string,
  { jp: string; label: string; icon: typeof Languages; iconColor: string }
> = {
  vocabulary: {
    jp: "文字・語彙",
    label: "Vocabulary",
    icon: Languages,
    iconColor: "bg-indigo-50 text-indigo-600",
  },
  grammar: {
    jp: "文法",
    label: "Grammar",
    icon: BookOpen,
    iconColor: "bg-amber-50 text-amber-600",
  },
  reading: {
    jp: "読解",
    label: "Reading",
    icon: FileText,
    iconColor: "bg-emerald-50 text-emerald-600",
  },
  listening: {
    jp: "聴解",
    label: "Listening",
    icon: Headphones,
    iconColor: "bg-sky-50 text-sky-600",
  },
};

export function StudyHub({
  snapshot,
  todayAnswered,
  dailyTarget,
  onStartQuiz,
  onOpenBank,
}: StudyHubProps) {
  const meta = LEVEL_META[snapshot.exam.toUpperCase()] ?? {
    title: snapshot.exam,
    subtitle: "Exam Mistake Bank",
    bannerBg: "from-slate-800 to-slate-700 text-white",
    btnBg: "bg-white text-slate-900 hover:bg-slate-100",
  };

  const coveragePct =
    snapshot.total > 0 ? Math.round((snapshot.seen / snapshot.total) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Selected Level Hero */}
      <section
        className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm sm:p-6 ${meta.bannerBg}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
              {meta.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 tabular-nums">
            <div className="rounded-xl bg-white/12 px-2.5 py-2 text-center backdrop-blur-xs sm:min-w-24 sm:px-3.5">
              <p className="text-sm font-bold sm:text-lg">
                {snapshot.seen}/{snapshot.total}
              </p>
              <p className="text-[10px] text-white/80 sm:text-[11px]">Reviewed</p>
            </div>
            <div className="rounded-xl bg-white/12 px-2.5 py-2 text-center backdrop-blur-xs sm:min-w-24 sm:px-3.5">
              <p className="text-sm font-bold sm:text-lg">
                {snapshot.attempts > 0 ? `${snapshot.accuracyPct}%` : "—"}
              </p>
              <p className="text-[10px] text-white/80 sm:text-[11px]">Accuracy</p>
            </div>
            <div className="rounded-xl bg-white/12 px-2.5 py-2 text-center backdrop-blur-xs sm:min-w-24 sm:px-3.5">
              <p className="text-sm font-bold sm:text-lg">
                {todayAnswered}/{dailyTarget}
              </p>
              <p className="text-[10px] text-white/80 sm:text-[11px]">Today</p>
            </div>
          </div>
        </div>

        {snapshot.total === 0 ? (
          <div className="mt-4 rounded-xl bg-white/15 p-3 text-xs text-white sm:text-sm">
            No {snapshot.exam} questions loaded yet. Add missed questions to{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 text-xs">
              01-mistake-bank/mistakes.csv
            </code>{" "}
            and run{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 text-xs">
              npm run sync
            </code>
            .
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
            <button
              type="button"
              disabled={snapshot.missedOrUnseen === 0}
              onClick={() =>
                onStartQuiz({
                  exam: snapshot.exam,
                  section: "ALL",
                  missedOnly: true,
                })
              }
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm ${meta.btnBg}`}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Due ({snapshot.missedOrUnseen})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onStartQuiz({
                  exam: snapshot.exam,
                  section: "ALL",
                  missedOnly: false,
                })
              }
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:px-4 sm:text-sm"
            >
              <Play className="h-3.5 w-3.5 shrink-0" />
              <span>All ({snapshot.total})</span>
            </button>

            <button
              type="button"
              onClick={onOpenBank}
              className="col-span-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 sm:ml-auto"
            >
              <Search className="h-3.5 w-3.5" />
              Browse {snapshot.exam === "ALL" ? "All" : snapshot.exam} Questions
            </button>
          </div>
        )}
      </section>

      {/* 4 Core Skill Modules — 2x2 Grid even on mobile for instant 1-tap access */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">
            {snapshot.exam === "ALL" ? "Sections" : `${snapshot.exam} Sections`}
          </h2>
          <span className="text-xs text-slate-500">
            {coveragePct}% seen · {snapshot.mastered} right
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {snapshot.sections.map((sec) => {
            const info = SECTION_META[sec.section] ?? {
              jp: sec.section,
              label: sec.section,
              icon: BookOpen,
              iconColor: "bg-slate-100 text-slate-600",
            };
            const Icon = info.icon;
            const disabled = sec.total === 0;

            return (
              <Card
                key={sec.section}
                className={`flex flex-col justify-between gap-2.5 p-3.5 sm:gap-3 sm:p-4 ${
                  disabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${info.iconColor}`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {sec.total} Qs
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                    {info.label}
                  </h3>
                  <p className="text-[11px] text-slate-400">{info.jp}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {sec.seen}/{sec.total}
                    </span>
                    <span>
                      {sec.attempts > 0 ? `${sec.accuracy}%` : "—"}
                    </span>
                  </div>
                  <ProgressBar
                    value={sec.seen}
                    max={sec.total || 1}
                    heightClassName="h-1.5"
                    barClassName={
                      sec.total === 0 ? "bg-slate-200" : "bg-indigo-600"
                    }
                  />
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onStartQuiz({
                      exam: snapshot.exam,
                      section: sec.section,
                      missedOnly: false,
                    })
                  }
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <span>{disabled ? "Empty" : "Practice"}</span>
                  {!disabled && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
