import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude } from "../route";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  optionCode: z.string().trim().min(1).max(50),
  optionName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  displayOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  isOnlineSellable: z.boolean().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductOptionId: string }> };

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

function serialize<T extends { serviceProductOptionId: bigint; serviceProductId: bigint; commonStatusId: bigint }>(row: T) {
  return {
    ...row,
    serviceProductOptionId: Number(row.serviceProductOptionId),
    serviceProductId: Number(row.serviceProductId),
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductOptionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid option id" }, { status: 400 });

    const row = await prisma.serviceProductOption.findUnique({
      where: { serviceProductOptionId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Option not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductOptionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid option id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 400 });
    }

    const updated = await prisma.serviceProductOption.update({
      where: { serviceProductOptionId: BigInt(id.data) },
      data: {
        optionCode: data.optionCode.trim().toUpperCase(),
        optionName: data.optionName.trim(),
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isDefault: data.isDefault ?? false,
        isOnlineSellable: data.isOnlineSellable ?? false,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Option not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This option code already exists for this product" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductOptionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid option id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductOption.update({
      where: { serviceProductOptionId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductOptionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid option id" }, { status: 400 });

    await prisma.serviceProductOption.delete({ where: { serviceProductOptionId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This option has variants linked to it and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
