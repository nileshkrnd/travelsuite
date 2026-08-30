import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const VALUE_TYPE_CODES = ["BOOLEAN", "TEXT", "NUMBER", "DATE", "TIME", "DATETIME"] as const;

const updateSchema = z.object({
  infoTypeCode: z.string().trim().min(1).max(50),
  infoTypeName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  valueTypeCode: z.enum(VALUE_TYPE_CODES),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function serialize<T extends { additionalInfoTypeId: bigint }>(row: T) {
  return { ...row, additionalInfoTypeId: Number(row.additionalInfoTypeId) };
}

function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

type RouteContext = { params: Promise<{ additionalInfoTypeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).additionalInfoTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid additional info type id" }, { status: 400 });

    const row = await prisma.additionalInfoTypeMaster.findUnique({
      where: { additionalInfoTypeId: id },
    });
    if (!row) return NextResponse.json({ error: "Additional info type not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).additionalInfoTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid additional info type id" }, { status: 400 });

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.additionalInfoTypeMaster.update({
      where: { additionalInfoTypeId: id },
      data: {
        infoTypeCode: data.infoTypeCode.trim().toUpperCase(),
        infoTypeName: data.infoTypeName.trim(),
        description: data.description?.trim() || null,
        valueTypeCode: data.valueTypeCode,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Additional info type not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This additional info type code already exists for this company" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).additionalInfoTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid additional info type id" }, { status: 400 });

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.additionalInfoTypeMaster.update({
      where: { additionalInfoTypeId: id },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Additional info type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).additionalInfoTypeId);
    if (id == null) return NextResponse.json({ error: "Invalid additional info type id" }, { status: 400 });

    await prisma.additionalInfoTypeMaster.delete({ where: { additionalInfoTypeId: id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Additional info type not found" }, { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "This additional info type is in use and cannot be deleted" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}
