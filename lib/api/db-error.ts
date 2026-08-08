import { NextResponse } from "next/server";

export function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and ADMINCNX_URL / BASECNX_URL / ACCOUNTSCNX_URL / HELPDESKCNX_URL are set.` },
    { status: 503 }
  );
}
