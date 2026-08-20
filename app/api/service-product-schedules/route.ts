import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
  .optional()
  .nullable();

const createSchema = z.object({
  serviceProductAvailabilityId: z.number().int().positive(),
  serviceProductId: z.number().int().positive(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  dayOfWeekId: z.number().int().positive().nullable().optional(),
  startTime: timeSchema,
  endTime: timeSchema,
  capacity: z.number().int().positive().nullable().optional(),
  isAvailable: z.boolean().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  dayOfWeek: { select: { dayOfWeekName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function toTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function toRow<
  T extends {
    serviceProductScheduleId: bigint;
    serviceProductAvailabilityId: bigint;
    serviceProductId: bigint;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    dayOfWeekId: bigint | null;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductScheduleId: Number(row.serviceProductScheduleId),
    serviceProductAvailabilityId: Number(row.serviceProductAvailabilityId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    dayOfWeekId: row.dayOfWeekId != null ? Number(row.dayOfWeekId) : null,
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const availabilityIdParam = searchParams.get("serviceProductAvailabilityId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductScheduleWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (availabilityIdParam != null && availabilityIdParam !== "") where.serviceProductAvailabilityId = BigInt(availabilityIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductSchedule.findMany({
      where,
      include: rowInclude,
      orderBy: [{ startTime: "asc" }],
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

    const availability = await prisma.serviceProductAvailability.findUnique({ where: { serviceProductAvailabilityId: BigInt(data.serviceProductAvailabilityId) } });
    if (!availability) return NextResponse.json({ error: "Availability not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.serviceProductSchedule.create({
      data: {
        serviceProductAvailabilityId: BigInt(data.serviceProductAvailabilityId),
        serviceProductId: BigInt(data.serviceProductId),
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        dayOfWeekId: data.dayOfWeekId != null ? BigInt(data.dayOfWeekId) : null,
        startTime: toTime(data.startTime),
        endTime: toTime(data.endTime),
        capacity: data.capacity ?? null,
        isAvailable: data.isAvailable ?? true,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
