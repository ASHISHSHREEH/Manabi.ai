"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { WeeklyDayPoint } from "@/lib/analytics";

interface WeeklyAnalyticsProps {
  data: WeeklyDayPoint[];
}

export function WeeklyAnalytics({ data }: WeeklyAnalyticsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const weeklyTotal = data.reduce((sum, d) => sum + d.answered, 0);
  const weeklyCorrect = data.reduce((sum, d) => sum + d.correct, 0);
  const weeklyAccuracy =
    weeklyTotal > 0 ? Math.round((weeklyCorrect / weeklyTotal) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Weekly Learning Analytics
          </p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">
            Questions Answered (Last 7 Days)
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-slate-900">{weeklyTotal}</span>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-1.5">
            <span className="text-emerald-700">Accuracy: </span>
            <span className="font-bold text-emerald-800">
              {weeklyTotal > 0 ? `${weeklyAccuracy}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="h-56 w-full min-w-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="answered"
                name="Answered"
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="correct"
                name="Correct"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-xl bg-slate-50" />
        )}
      </div>

      <p className="text-xs text-slate-500">
        {weeklyTotal === 0
          ? "Start a quiz session to populate your real 7-day study chart."
          : `You answered ${weeklyTotal} question${weeklyTotal === 1 ? "" : "s"} (${weeklyCorrect} correct) over the last 7 days.`}
      </p>
    </Card>
  );
}
