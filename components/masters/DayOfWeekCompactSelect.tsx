"use client";

import { cn } from "@/lib/utils";
import type { DayOfWeek } from "@/types/day-of-week";

/**
 * Compact always-visible 7-day toggle strip for spreadsheet-style rows — fits in a single
 * line alongside other row fields. Leave all unselected to mean "every day of the week".
 */
export function DayOfWeekCompactSelect({
  days,
  value,
  onChange,
  disabled,
}: {
  days: DayOfWeek[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);

  function toggle(id: number) {
    if (disabled) return;
    if (selected.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="flex flex-nowrap gap-0.5" title="Applicable days — leave all off for every day">
      {days.map((day) => {
        const checked = selected.has(day.dayOfWeekId);
        const letters = (day.shortName || day.dayOfWeekCode || "?").trim().slice(0, 2).toUpperCase();
        return (
          <button
            key={day.dayOfWeekId}
            type="button"
            title={day.dayOfWeekName}
            aria-pressed={checked}
            disabled={disabled}
            onClick={() => toggle(day.dayOfWeekId)}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border text-[9px] font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {letters}
          </button>
        );
      })}
    </div>
  );
}
