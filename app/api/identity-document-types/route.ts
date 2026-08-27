import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  documentTypeCode: z.string().trim().min(1).max(50),
  documentTypeName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(250).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

function serialize<T extends { identityDocumentTypeId: bigint }>(row: T) {
  return { ...row, identityDocumentTypeId: Number(row.identityDocumentTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const where: Prisma.IdentityDocumentTypeMasterWhereInput = {};
    if (activeOnly) where.isActive = true;

    const rows = await prisma.identityDocumentTypeMaster.findMany({
      where,
      orderBy: [{ documentTypeCode: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
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

    const created = await prisma.identityDocumentTypeMaster.create({
      data: {
        documentTypeCode: data.documentTypeCode.trim().toUpperCase(),
        documentTypeName: data.documentTypeName.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This document type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
