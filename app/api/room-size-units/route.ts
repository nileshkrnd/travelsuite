import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/** RoomSizeUnitID is a BigInt column — convert to number before NextResponse.json(). */
function serialize<T extends { roomSizeUnitId: bigint }>(row: T) {
  return { ...row, roomSizeUnitId: Number(row.roomSizeUnitId) };
}

/** Room size unit master — SQM, SQFT, … Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const rows = await prisma.roomSizeUnit.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: [{ displayOrder: "asc" }, { roomSizeUnitName: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
