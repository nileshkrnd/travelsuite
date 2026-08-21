import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude, validateInventoryLookups } from "../route";

const idSchema = z.coerce.number().int().positive();

const periodSchema = z.object({
  fromDate: z.string().trim().min(1),
  toDate: z.string().trim().min(1),
  isMonday: z.boolean().optional(),
  isTuesday: z.boolean().optional(),
  isWednesday: z.boolean().optional(),
  isThursday: z.boolean().optional(),
  isFriday: z.boolean().optional(),
  isSaturday: z.boolean().optional(),
  isSunday: z.boolean().optional(),
  allotmentQty: z.number().int().min(0).optional(),
  releaseDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductSupplierId: z.number().int().positive().nullable().optional(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  serviceProductScheduleId: z.number().int().positive().nullable().optional(),
  inventoryTypeId: z.number().int().positive(),
  validFrom: z.string().trim().min(1).nullable().optional(),
  validTo: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  periods: z.array(periodSchema).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductInventoryId: string }> };

function toRow<
  T extends {
    serviceProductInventoryId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    serviceProductScheduleId: bigint | null;
    inventoryTypeId: bigint;
    periods?: { serviceProductInventoryPeriodId: bigint; serviceProductInventoryId: bigint }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductInventoryId: Number(row.serviceProductInventoryId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    serviceProductScheduleId: row.serviceProductScheduleId != null ? Number(row.serviceProductScheduleId) : null,
    inventoryTypeId: Number(row.inventoryTypeId),
    periods: row.periods?.map((p) => ({
      ...p,
      serviceProductInventoryPeriodId: Number(p.serviceProductInventoryPeriodId),
      serviceProductInventoryId: Number(p.serviceProductInventoryId),
    })),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductInventory.findUnique({
      where: { serviceProductInventoryId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const inventoryId = BigInt(id.data);

    const lookupError = await validateInventoryLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductInventory.update({
        where: { serviceProductInventoryId: inventoryId },
        data: {
          serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          serviceProductScheduleId: data.serviceProductScheduleId != null ? BigInt(data.serviceProductScheduleId) : null,
          inventoryTypeId: BigInt(data.inventoryTypeId),
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
          validTo: data.validTo ? new Date(data.validTo) : null,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      await tx.serviceProductInventoryPeriod.deleteMany({ where: { serviceProductInventoryId: inventoryId } });
      if (data.periods?.length) {
        await tx.serviceProductInventoryPeriod.createMany({
          data: data.periods.map((p) => ({
            serviceProductInventoryId: inventoryId,
            fromDate: new Date(p.fromDate),
            toDate: new Date(p.toDate),
            isMonday: p.isMonday ?? true,
            isTuesday: p.isTuesday ?? true,
            isWednesday: p.isWednesday ?? true,
            isThursday: p.isThursday ?? true,
            isFriday: p.isFriday ?? true,
            isSaturday: p.isSaturday ?? true,
            isSunday: p.isSunday ?? true,
            allotmentQty: p.allotmentQty ?? 0,
            releaseDays: p.releaseDays ?? 0,
            isActive: p.isActive ?? true,
            createdBy: data.modifiedBy,
          })),
        });
      }

      return tx.serviceProductInventory.findUniqueOrThrow({
        where: { serviceProductInventoryId: inventoryId },
        include: rowInclude,
      });
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductInventory.update({
      where: { serviceProductInventoryId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductInventory.delete({ where: { serviceProductInventoryId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
