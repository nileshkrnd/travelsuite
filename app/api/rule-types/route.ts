import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.RuleTypeWhereInput = {};
    if (activeOnly) where.isActive = true;

    const rows = await prisma.ruleType.findMany({ where, orderBy: [{ ruleTypeName: "asc" }] });
    return NextResponse.json(
      rows.map((r) => ({
        ruleTypeId: Number(r.ruleTypeId),
        ruleTypeCode: r.ruleTypeCode,
        ruleTypeName: r.ruleTypeName,
        isActive: r.isActive,
      }))
    );
  } catch (error) {
    return dbUnavailable(error);
  }
}
