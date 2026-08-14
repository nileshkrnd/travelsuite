import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

function serialize<T extends { mediaTypeId: bigint }>(row: T) {
  return { ...row, mediaTypeId: Number(row.mediaTypeId) };
}

/** Media Type lookup — Image, Video, Virtual Tour, … Global, read-only reference data. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.mediaType.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
