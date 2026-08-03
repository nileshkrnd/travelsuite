import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

/** Global lookup — State, Province, Emirate, Governorate, Region. Read-only from the app. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.stateAdministrativeType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { typeName: "asc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}
