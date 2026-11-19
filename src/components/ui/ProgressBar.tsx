interface ProgressBarProps {
  value: number;
  max?: number;
  barClassName?: string;
  heightClassName?: string;
}

export function ProgressBar({
  value,
  max = 100,
  barClassName = "bg-indigo-600",
  heightClassName = "h-2.5",
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${heightClassName}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
