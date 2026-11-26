"use client";

import { useState, type ChangeEvent } from "react";
import { Download, Flame, Target, Trash2, Trophy, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StudyCalendar } from "@/components/calendar/StudyCalendar";
import { WeeklyAnalytics } from "@/components/stats/WeeklyAnalytics";
import type { ExamBreakdown, SectionBreakdown, WeeklyDayPoint } from "@/lib/analytics";
import type { DailyActivityMap } from "@/types/question";

interface StatsViewProps {
  totalQuestions: number;
  totalAttempts: number;
  uniqueSeen: number;
  accuracyPct: number;
  streakDays: number;
  dailyTarget: number;
  dailyActivity: DailyActivityMap;
  examDates: Record<string, string>;
  exams: ExamBreakdown[];
  sections: SectionBreakdown[];
  weeklySeries: WeeklyDayPoint[];
  onUpdateDailyTarget: (target: number) => void;
  onUpdateExamDate: (exam: string, dateIso: string) => void;
  onExportBackup: () => void;
  onImportBackup: (rawJson: string) => void;
  onResetProgress: () => void;
}

export function StatsView({
  totalQuestions,
  totalAttempts,
  uniqueSeen,
  accuracyPct,
  streakDays,
  dailyTarget,
  dailyActivity,
  examDates,
  exams,
  sections,
  weeklySeries,
  onUpdateDailyTarget,
  onUpdateExamDate,
  onExportBackup,
  onImportBackup,
  onResetProgress,
}: StatsViewProps) {
  const [statusMessage, setStatusMessage] = useState("");

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportBackup(String(reader.result ?? ""));
        setStatusMessage("Progress backup imported cleanly.");
      } catch {
        setStatusMessage("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Streak</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{streakDays} days</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Flame className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Coverage</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {uniqueSeen}/{totalQuestions}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Trophy className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Overall Accuracy</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalAttempts > 0 ? `${accuracyPct}%` : "—"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Target className="h-5 w-5" />
          </div>
        </Card>
      </div>

      <WeeklyAnalytics data={weeklySeries} />

      <StudyCalendar
        dailyActivity={dailyActivity}
        dailyTarget={dailyTarget}
        examDates={examDates}
        onUpdateExamDate={onUpdateExamDate}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-3.5">
          <h3 className="text-base font-bold text-slate-900">By Exam</h3>
          <div className="space-y-3">
            {exams.map((ex) => (
              <div key={ex.exam} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{ex.exam}</span>
                  <span className="text-xs text-slate-500">
                    {ex.seen}/{ex.total} seen ·{" "}
                    {ex.seen > 0 ? `${ex.accuracy}% accuracy` : "No attempts"}
                  </span>
                </div>
                <ProgressBar
                  value={ex.seen}
                  max={ex.total || 1}
                  barClassName="bg-indigo-600"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3.5">
          <h3 className="text-base font-bold text-slate-900">By Section</h3>
          <div className="space-y-3">
            {sections.map((sec) => (
              <div key={sec.section} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize text-slate-800">
                    {sec.section}
                  </span>
                  <span className="text-xs text-slate-500">
                    {sec.total} Qs ·{" "}
                    {sec.attempts > 0
                      ? `${sec.correct}/${sec.attempts} (${sec.accuracy}%)`
                      : "Not started"}
                  </span>
                </div>
                <ProgressBar
                  value={sec.accuracy}
                  max={100}
                  barClassName={
                    sec.attempts === 0
                      ? "bg-slate-200"
                      : sec.accuracy >= 80
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Daily Goal &amp; Browser Backup
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Progress is saved in your browser localStorage. Export a JSON backup anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-slate-600">
            Daily Target:
          </span>
          {[10, 20, 30, 50].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onUpdateDailyTarget(num)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                dailyTarget === num
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {num} Qs
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              onExportBackup();
              setStatusMessage("Downloaded JSON backup.");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export Backup
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" />
            Import Backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              onResetProgress();
              setStatusMessage("Saved browser progress cleared.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset Progress
          </button>
        </div>

        {statusMessage && (
          <p className="text-xs font-medium text-indigo-700">{statusMessage}</p>
        )}
      </Card>
    </div>
  );
}
