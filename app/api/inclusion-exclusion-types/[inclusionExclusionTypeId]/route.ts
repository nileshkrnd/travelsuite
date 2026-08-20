import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  typeCode: z.string().trim().min(1).max(50),
  typeName: z.string().trim().min(1).max(100),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ inclusionExclusionTypeId: string }> };

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

function toRow<T extends { inclusionExclusionTypeId: bigint }>(row: T) {
  return { ...row, inclusionExclusionTypeId: Number(row.inclusionExclusionTypeId) };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { inclusionExclusionTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.inclusionExclusionType.findUnique({ where: { inclusionExclusionTypeId: BigInt(id.data) } });
    if (!row) return NextResponse.json({ error: "Type not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { inclusionExclusionTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.inclusionExclusionType.update({
      where: { inclusionExclusionTypeId: BigInt(id.data) },
      data: {
        typeCode: data.typeCode.trim().toUpperCase(),
        typeName: data.typeName.trim(),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Type not found" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "This type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { inclusionExclusionTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.inclusionExclusionType.update({
      where: { inclusionExclusionTypeId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { inclusionExclusionTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.inclusionExclusionType.delete({ where: { inclusionExclusionTypeId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Type not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This type is used by inclusion/exclusion items and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
