/** Weighted setup-completion percentage + progress bar. */
export function CompletionProgress({
  percentage,
  completedCount,
  totalCount,
}: {
  percentage: number;
  completedCount: number;
  totalCount: number;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{clamped}%</span>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} areas configured
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
