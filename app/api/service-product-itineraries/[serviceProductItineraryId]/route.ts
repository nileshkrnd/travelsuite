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
  parentServiceProductItineraryId: z.number().int().positive().nullable().optional(),
  dayNumber: z.number().int().positive().nullable().optional(),
  sequenceNumber: z.number().int().min(0),
  title: z.string().trim().min(1).max(250),
  description: z.string().trim().max(4000).nullable().optional(),
  durationValue: z.number().nonnegative().nullable().optional(),
  durationUnitId: z.number().int().positive().nullable().optional(),
  startTime: timeSchema,
  endTime: timeSchema,
  serviceProductLocationId: z.number().int().positive().nullable().optional(),
  isOvernight: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isHighlight: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductItineraryId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  parent: { select: { title: true } },
  durationUnit: { select: { durationUnitName: true } },
  location: { select: { locationName: true } },
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
    serviceProductItineraryId: bigint;
    serviceProductId: bigint;
    parentServiceProductItineraryId: bigint | null;
    durationUnitId: bigint | null;
    serviceProductLocationId: bigint | null;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductItineraryId: Number(row.serviceProductItineraryId),
    serviceProductId: Number(row.serviceProductId),
    parentServiceProductItineraryId:
      row.parentServiceProductItineraryId != null ? Number(row.parentServiceProductItineraryId) : null,
    durationUnitId: row.durationUnitId != null ? Number(row.durationUnitId) : null,
    serviceProductLocationId: row.serviceProductLocationId != null ? Number(row.serviceProductLocationId) : null,
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductItineraryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductItinerary.findUnique({
      where: { serviceProductItineraryId: BigInt(id.data) },
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
    const { serviceProductItineraryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const targetId = BigInt(id.data);

    const existing = await prisma.serviceProductItinerary.findUnique({ where: { serviceProductItineraryId: targetId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (data.parentServiceProductItineraryId != null) {
      const parentId = BigInt(data.parentServiceProductItineraryId);
      if (parentId === targetId) {
        return NextResponse.json({ error: "An itinerary stop cannot be its own parent" }, { status: 400 });
      }
      const parent = await prisma.serviceProductItinerary.findUnique({ where: { serviceProductItineraryId: parentId } });
      if (!parent || parent.serviceProductId !== existing.serviceProductId) {
        return NextResponse.json({ error: "Parent itinerary stop must belong to the same product" }, { status: 400 });
      }
      let cursor: bigint | null = parent.parentServiceProductItineraryId;
      for (let depth = 0; cursor != null && depth < 20; depth += 1) {
        if (cursor === targetId) {
          return NextResponse.json({ error: "Cannot create a circular parent chain" }, { status: 400 });
        }
        const ancestor: { parentServiceProductItineraryId: bigint | null } | null =
          await prisma.serviceProductItinerary.findUnique({
            where: { serviceProductItineraryId: cursor },
            select: { parentServiceProductItineraryId: true },
          });
        cursor = ancestor?.parentServiceProductItineraryId ?? null;
      }
    }

    const updated = await prisma.serviceProductItinerary.update({
      where: { serviceProductItineraryId: targetId },
      data: {
        parentServiceProductItineraryId:
          data.parentServiceProductItineraryId != null ? BigInt(data.parentServiceProductItineraryId) : null,
        dayNumber: data.dayNumber ?? null,
        sequenceNumber: data.sequenceNumber,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        durationValue: data.durationValue ?? null,
        durationUnitId: data.durationUnitId != null ? BigInt(data.durationUnitId) : null,
        startTime: toTime(data.startTime),
        endTime: toTime(data.endTime),
        serviceProductLocationId: data.serviceProductLocationId != null ? BigInt(data.serviceProductLocationId) : null,
        isOvernight: data.isOvernight ?? false,
        isOptional: data.isOptional ?? false,
        isHighlight: data.isHighlight ?? false,
        displayOrder: data.displayOrder ?? 0,
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
    const { serviceProductItineraryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductItinerary.update({
      where: { serviceProductItineraryId: BigInt(id.data) },
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
    const { serviceProductItineraryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductItinerary.delete({ where: { serviceProductItineraryId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This stop has child stops linked to it and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
