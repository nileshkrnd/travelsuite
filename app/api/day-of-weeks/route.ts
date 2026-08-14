import { NextResponse } from "next/server";
import { dbUnavailable } from "@/lib/api/db-error";
import { listDayOfWeekRows } from "@/lib/api/day-of-week-helpers";

/** Day of week master — Monday–Sunday. Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    return NextResponse.json(await listDayOfWeekRows(activeOnly));
  } catch (error) {
    return dbUnavailable(error);
  }
}
