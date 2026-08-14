import type { DayOfWeek } from "@/types";

export interface DayOfWeekRow {
  dayOfWeekId: bigint | number;
  dayOfWeekCode: string;
  dayOfWeekName: string;
  shortName: string;
  displayOrder: number;
  isActive: boolean;
}

export function toAppDayOfWeek(row: DayOfWeekRow): DayOfWeek {
  return {
    dayOfWeekId: Number(row.dayOfWeekId),
    dayOfWeekCode: row.dayOfWeekCode,
    dayOfWeekName: row.dayOfWeekName,
    shortName: row.shortName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}
