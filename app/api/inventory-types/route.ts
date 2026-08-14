import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/** Global inventory type lookup — Allotment / Free Sale / On Request. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.inventoryType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ displayOrder: "asc" }, { inventoryTypeCode: "asc" }],
    });

    return NextResponse.json(
      rows.map((row) => ({
        inventoryTypeId: Number(row.inventoryTypeId),
        inventoryTypeCode: row.inventoryTypeCode,
        inventoryTypeName: row.inventoryTypeName,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      }))
    );
  } catch (error) {
    return dbUnavailable(error);
  }
}
