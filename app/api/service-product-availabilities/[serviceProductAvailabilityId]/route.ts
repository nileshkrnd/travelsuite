import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const dayInputSchema = z.object({
  dayOfWeekId: z.number().int().positive(),
  isAvailable: z.boolean(),
});

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductAvailabilityId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  commonStatus: { select: { statusName: true } },
  days: { include: { dayOfWeek: { select: { dayOfWeekName: true } } } },
} as const;

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductAvailabilityId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductAvailability.findUnique({ where: { serviceProductAvailabilityId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductAvailabilityId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const availabilityId = BigInt(id.data);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductAvailability.update({
        where: { serviceProductAvailabilityId: availabilityId },
        data: {
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          bookingFromDate: data.bookingFromDate ? new Date(data.bookingFromDate) : null,
          bookingToDate: data.bookingToDate ? new Date(data.bookingToDate) : null,
          serviceFromDate: data.serviceFromDate ? new Date(data.serviceFromDate) : null,
          serviceToDate: data.serviceToDate ? new Date(data.serviceToDate) : null,
          isAvailable: data.isAvailable ?? true,
          commonStatusId: BigInt(data.commonStatusId),
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      if (data.days) {
        await tx.serviceProductAvailabilityDay.deleteMany({ where: { serviceProductAvailabilityId: availabilityId } });
        if (data.days.length) {
          await tx.serviceProductAvailabilityDay.createMany({
            data: data.days.map((d) => ({
              serviceProductAvailabilityId: availabilityId,
              dayOfWeekId: BigInt(d.dayOfWeekId),
              isAvailable: d.isAvailable,
              createdBy: data.modifiedBy,
            })),
          });
        }
      }

      return tx.serviceProductAvailability.findUniqueOrThrow({ where: { serviceProductAvailabilityId: availabilityId }, include: rowInclude });
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
    const { serviceProductAvailabilityId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductAvailability.update({
      where: { serviceProductAvailabilityId: BigInt(id.data) },
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
    const { serviceProductAvailabilityId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductAvailability.delete({ where: { serviceProductAvailabilityId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This availability has schedules linked to it and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
