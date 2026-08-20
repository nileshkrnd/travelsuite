import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  typeCode: z.string().trim().min(1).max(50),
  typeName: z.string().trim().min(1).max(100),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

function toRow<T extends { inclusionExclusionTypeId: bigint }>(row: T) {
  return { ...row, inclusionExclusionTypeId: Number(row.inclusionExclusionTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.inclusionExclusionType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ typeCode: "asc" }],
    });
    return NextResponse.json(rows.map(toRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.inclusionExclusionType.create({
      data: {
        typeCode: data.typeCode.trim().toUpperCase(),
        typeName: data.typeName.trim(),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
