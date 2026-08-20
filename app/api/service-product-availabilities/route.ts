import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const dayInputSchema = z.object({
  dayOfWeekId: z.number().int().positive(),
  isAvailable: z.boolean(),
});

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  bookingFromDate: z.string().trim().min(1).optional().nullable(),
  bookingToDate: z.string().trim().min(1).optional().nullable(),
  serviceFromDate: z.string().trim().min(1).optional().nullable(),
  serviceToDate: z.string().trim().min(1).optional().nullable(),
  isAvailable: z.boolean().optional(),
  commonStatusId: z.number().int().positive(),
  days: z.array(dayInputSchema).optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  commonStatus: { select: { statusName: true } },
  days: { include: { dayOfWeek: { select: { dayOfWeekName: true } } } },
} as const;

function toRow<
  T extends {
    serviceProductAvailabilityId: bigint;
    serviceProductId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    commonStatusId: bigint;
    days?: { serviceProductAvailabilityDayId: bigint; serviceProductAvailabilityId: bigint; dayOfWeekId: bigint }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductAvailabilityId: Number(row.serviceProductAvailabilityId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    commonStatusId: Number(row.commonStatusId),
    days: row.days?.map((d) => ({
      ...d,
      serviceProductAvailabilityDayId: Number(d.serviceProductAvailabilityDayId),
      serviceProductAvailabilityId: Number(d.serviceProductAvailabilityId),
      dayOfWeekId: Number(d.dayOfWeekId),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const optionIdParam = searchParams.get("serviceProductOptionId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductAvailabilityWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (optionIdParam != null && optionIdParam !== "") where.serviceProductOptionId = BigInt(optionIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductAvailability.findMany({
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

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.serviceProductAvailability.create({
        data: {
          serviceProductId: BigInt(data.serviceProductId),
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          bookingFromDate: data.bookingFromDate ? new Date(data.bookingFromDate) : null,
          bookingToDate: data.bookingToDate ? new Date(data.bookingToDate) : null,
          serviceFromDate: data.serviceFromDate ? new Date(data.serviceFromDate) : null,
          serviceToDate: data.serviceToDate ? new Date(data.serviceToDate) : null,
          isAvailable: data.isAvailable ?? true,
          commonStatusId: BigInt(data.commonStatusId),
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
      });
      if (data.days?.length) {
        await tx.serviceProductAvailabilityDay.createMany({
          data: data.days.map((d) => ({
            serviceProductAvailabilityId: row.serviceProductAvailabilityId,
            dayOfWeekId: BigInt(d.dayOfWeekId),
            isAvailable: d.isAvailable,
            createdBy: data.createdBy,
          })),
        });
      }
      return tx.serviceProductAvailability.findUniqueOrThrow({ where: { serviceProductAvailabilityId: row.serviceProductAvailabilityId }, include: rowInclude });
    });

    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
