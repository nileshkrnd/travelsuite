import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.branchType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { branchTypeName: "asc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}
