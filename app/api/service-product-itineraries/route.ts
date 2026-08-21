import { NextResponse } from "next/server";
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
  serviceProductId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.serviceProductItinerary.findMany({
      where: {
        ...(productIdParam != null && productIdParam !== "" ? { serviceProductId: BigInt(productIdParam) } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: rowInclude,
      orderBy: [{ dayNumber: "asc" }, { sequenceNumber: "asc" }],
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

    if (data.parentServiceProductItineraryId != null) {
      const parent = await prisma.serviceProductItinerary.findUnique({
        where: { serviceProductItineraryId: BigInt(data.parentServiceProductItineraryId) },
      });
      if (!parent || parent.serviceProductId !== BigInt(data.serviceProductId)) {
        return NextResponse.json({ error: "Parent itinerary stop must belong to the same product" }, { status: 400 });
      }
    }

    const created = await prisma.serviceProductItinerary.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
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
