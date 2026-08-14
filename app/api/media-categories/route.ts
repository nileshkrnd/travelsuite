import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

function serialize<T extends { mediaCategoryId: bigint }>(row: T) {
  return { ...row, mediaCategoryId: Number(row.mediaCategoryId) };
}

/** Media Category lookup — Room, Bathroom, View, Bed, Amenities, … Global, read-only reference data. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.mediaCategory.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
