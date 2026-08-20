import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  rateTypeCode: z.string().trim().min(1).max(50),
  rateTypeName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  rateTypeGroupId: z.number().int().positive().nullable().optional(),
  isPaxType: z.boolean().optional(),
  isQuantityType: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ rateTypeId: string }> };

const rowInclude = { rateTypeGroup: { select: { rateTypeGroupName: true } } } as const;

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

async function withCompanyName<T extends { companyId: number | null; rateTypeId: bigint; rateTypeGroupId: bigint | null }>(row: T) {
  const company = row.companyId != null ? await prisma.company.findUnique({ where: { companyId: row.companyId }, select: { companyName: true } }) : null;
  return {
    ...row,
    rateTypeId: Number(row.rateTypeId),
    rateTypeGroupId: row.rateTypeGroupId != null ? Number(row.rateTypeGroupId) : null,
    companyName: company?.companyName ?? null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { rateTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid rate type id" }, { status: 400 });

    const row = await prisma.rateType.findUnique({ where: { rateTypeId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Rate type not found" }, { status: 404 });
    return NextResponse.json(await withCompanyName(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { rateTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid rate type id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const company = await prisma.company.findFirst({ where: { companyId: data.companyId, tenantId: data.tenantId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    if (data.rateTypeGroupId != null) {
      const group = await prisma.rateTypeGroupMaster.findUnique({ where: { rateTypeGroupId: BigInt(data.rateTypeGroupId) } });
      if (!group) {
        return NextResponse.json({ error: "Rate type group not found" }, { status: 400 });
      }
    }

    const updated = await prisma.rateType.update({
      where: { rateTypeId: BigInt(id.data) },
      data: {
        rateTypeCode: data.rateTypeCode.trim().toUpperCase(),
        rateTypeName: data.rateTypeName.trim(),
        description: data.description?.trim() || null,
        rateTypeGroupId: data.rateTypeGroupId != null ? BigInt(data.rateTypeGroupId) : null,
        isPaxType: data.isPaxType ?? false,
        isQuantityType: data.isQuantityType ?? false,
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Rate type not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This rate type code already exists for this company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { rateTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid rate type id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.rateType.update({
      where: { rateTypeId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Rate type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { rateTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid rate type id" }, { status: 400 });

    await prisma.rateType.delete({ where: { rateTypeId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Rate type not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This rate type is in use and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
