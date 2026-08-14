import type { DayOfWeek } from "@/types";

/** Static Mon–Sun fallback when DayOfWeek API / DB seed is unavailable. IDs match seeded rows. */
export const FALLBACK_DAYS_OF_WEEK: DayOfWeek[] = [
  { dayOfWeekId: 1, dayOfWeekCode: "MON", dayOfWeekName: "Monday", shortName: "Mon", displayOrder: 1, isActive: true },
  { dayOfWeekId: 2, dayOfWeekCode: "TUE", dayOfWeekName: "Tuesday", shortName: "Tue", displayOrder: 2, isActive: true },
  { dayOfWeekId: 3, dayOfWeekCode: "WED", dayOfWeekName: "Wednesday", shortName: "Wed", displayOrder: 3, isActive: true },
  { dayOfWeekId: 4, dayOfWeekCode: "THU", dayOfWeekName: "Thursday", shortName: "Thu", displayOrder: 4, isActive: true },
  { dayOfWeekId: 5, dayOfWeekCode: "FRI", dayOfWeekName: "Friday", shortName: "Fri", displayOrder: 5, isActive: true },
  { dayOfWeekId: 6, dayOfWeekCode: "SAT", dayOfWeekName: "Saturday", shortName: "Sat", displayOrder: 6, isActive: true },
  { dayOfWeekId: 7, dayOfWeekCode: "SUN", dayOfWeekName: "Sunday", shortName: "Sun", displayOrder: 7, isActive: true },
];
