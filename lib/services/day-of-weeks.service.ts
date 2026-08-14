import { FALLBACK_DAYS_OF_WEEK } from "@/lib/constants/day-of-week-fallback";
import { toAppDayOfWeek, type DayOfWeekRow } from "@/lib/mappers/day-of-week.mapper";
import type { DayOfWeek } from "@/types";

export class DayOfWeeksApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "DayOfWeeksApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listDayOfWeeks(options?: { activeOnly?: boolean }): Promise<DayOfWeek[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/day-of-weeks${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) {
    if (options?.activeOnly !== false) {
      return FALLBACK_DAYS_OF_WEEK.filter((d) => d.isActive);
    }
    throw new DayOfWeeksApiError(await parseError(res), res.status);
  }
  return ((await res.json()) as DayOfWeekRow[]).map(toAppDayOfWeek);
}
