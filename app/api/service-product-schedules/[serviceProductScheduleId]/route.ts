import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
  .optional()
  .nullable();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductScheduleId: string }> };

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

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductScheduleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductSchedule.findUnique({ where: { serviceProductScheduleId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductScheduleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductSchedule.update({
      where: { serviceProductScheduleId: BigInt(id.data) },
      data: {
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        dayOfWeekId: data.dayOfWeekId != null ? BigInt(data.dayOfWeekId) : null,
        startTime: toTime(data.startTime),
        endTime: toTime(data.endTime),
        capacity: data.capacity ?? null,
        isAvailable: data.isAvailable ?? true,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductScheduleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductSchedule.update({
      where: { serviceProductScheduleId: BigInt(id.data) },
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
    const { serviceProductScheduleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductSchedule.delete({ where: { serviceProductScheduleId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This schedule has rates linked to it and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
