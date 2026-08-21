import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

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

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

export type ServiceProductInventoryWriteData = z.infer<typeof createSchema>;
export type ServiceProductInventoryLookupData = Omit<ServiceProductInventoryWriteData, "createdBy">;

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  inventoryType: { select: { inventoryTypeName: true } },
  periods: { orderBy: [{ fromDate: "asc" as const }] },
};

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

export async function validateInventoryLookups(
  data: ServiceProductInventoryLookupData
): Promise<NextResponse | null> {
  const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
  if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

  const inventoryType = await prisma.inventoryType.findUnique({ where: { inventoryTypeId: BigInt(data.inventoryTypeId) } });
  if (!inventoryType) return NextResponse.json({ error: "Inventory type not found" }, { status: 400 });

  if (data.serviceProductSupplierId != null) {
    const link = await prisma.serviceProductSupplier.findUnique({ where: { serviceProductSupplierId: BigInt(data.serviceProductSupplierId) } });
    if (!link || link.serviceProductId !== BigInt(data.serviceProductId)) {
      return NextResponse.json({ error: "Supplier link not found for this product" }, { status: 400 });
    }
  }
  if (data.serviceProductOptionId != null) {
    const option = await prisma.serviceProductOption.findUnique({ where: { serviceProductOptionId: BigInt(data.serviceProductOptionId) } });
    if (!option || option.serviceProductId !== BigInt(data.serviceProductId)) {
      return NextResponse.json({ error: "Option not found for this product" }, { status: 400 });
    }
  }
  if (data.serviceProductVariantId != null) {
    const variant = await prisma.serviceProductVariant.findUnique({
      where: { serviceProductVariantId: BigInt(data.serviceProductVariantId) },
      include: { option: true },
    });
    if (!variant || variant.option.serviceProductId !== BigInt(data.serviceProductId)) {
      return NextResponse.json({ error: "Variant not found for this product" }, { status: 400 });
    }
  }
  if (data.serviceProductScheduleId != null) {
    const schedule = await prisma.serviceProductSchedule.findUnique({ where: { serviceProductScheduleId: BigInt(data.serviceProductScheduleId) } });
    if (!schedule || schedule.serviceProductId !== BigInt(data.serviceProductId)) {
      return NextResponse.json({ error: "Schedule not found for this product" }, { status: 400 });
    }
  }

  for (const period of data.periods ?? []) {
    if (period.fromDate > period.toDate) {
      return NextResponse.json({ error: "Period from-date must be on or before to-date" }, { status: 400 });
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductInventoryWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductInventory.findMany({
      where,
      include: rowInclude,
      orderBy: [{ createdDtTm: "desc" }],
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

    const lookupError = await validateInventoryLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.serviceProductInventory.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        serviceProductScheduleId: data.serviceProductScheduleId != null ? BigInt(data.serviceProductScheduleId) : null,
        inventoryTypeId: BigInt(data.inventoryTypeId),
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        periods: {
          create: (data.periods ?? []).map((p) => ({
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
            createdBy: data.createdBy,
          })),
        },
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Duplicate inventory entry" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
