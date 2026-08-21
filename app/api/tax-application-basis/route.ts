import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.TaxApplicationBasisWhereInput = {};
    if (activeOnly) where.isActive = true;

    const rows = await prisma.taxApplicationBasis.findMany({ where, orderBy: [{ displayOrder: "asc" }] });
    return NextResponse.json(
      rows.map((r) => ({
        taxApplicationBasisId: Number(r.taxApplicationBasisId),
        taxApplicationBasisCode: r.taxApplicationBasisCode,
        taxApplicationBasisName: r.taxApplicationBasisName,
        isActive: r.isActive,
        displayOrder: r.displayOrder,
      }))
    );
  } catch (error) {
    return dbUnavailable(error);
  }
}
