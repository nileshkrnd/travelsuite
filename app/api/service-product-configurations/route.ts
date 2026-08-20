import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const upsertSchema = z.object({
  serviceProductId: z.number().int().positive(),
  durationValue: z.number().nullable().optional(),
  durationUnitId: z.number().int().positive().nullable().optional(),
  bookingModelId: z.number().int().positive().nullable().optional(),
  pricingModelId: z.number().int().positive().nullable().optional(),
  minimumPax: z.number().int().nullable().optional(),
  maximumPax: z.number().int().nullable().optional(),
  minimumAge: z.number().int().nullable().optional(),
  maximumAge: z.number().int().nullable().optional(),
  isInstantConfirmation: z.boolean().optional(),
  isRequestOnly: z.boolean().optional(),
  isDateRequired: z.boolean().optional(),
  isTimeRequired: z.boolean().optional(),
  isPickupRequired: z.boolean().optional(),
  isDropoffRequired: z.boolean().optional(),
  isScheduleRequired: z.boolean().optional(),
  isAvailabilityRequired: z.boolean().optional(),
  isItineraryRequired: z.boolean().optional(),
  isCancellationPolicyRequired: z.boolean().optional(),
  actorId: z.number().int().positive(),
});

const rowInclude = {
  durationUnit: { select: { durationUnitName: true } },
  bookingModel: { select: { bookingModelName: true } },
  pricingModel: { select: { pricingModelName: true } },
} as const;

function serialize<T extends { serviceProductConfigurationId: bigint; serviceProductId: bigint; durationUnitId: bigint | null; bookingModelId: bigint | null; pricingModelId: bigint | null }>(
  row: T
) {
  return {
    ...row,
    serviceProductConfigurationId: Number(row.serviceProductConfigurationId),
    serviceProductId: Number(row.serviceProductId),
    durationUnitId: row.durationUnitId != null ? Number(row.durationUnitId) : null,
    bookingModelId: row.bookingModelId != null ? Number(row.bookingModelId) : null,
    pricingModelId: row.pricingModelId != null ? Number(row.pricingModelId) : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceProductIdParam = searchParams.get("serviceProductId");
    if (!serviceProductIdParam) {
      return NextResponse.json({ error: "serviceProductId is required" }, { status: 400 });
    }
    const row = await prisma.serviceProductConfiguration.findUnique({
      where: { serviceProductId: BigInt(serviceProductIdParam) },
      include: rowInclude,
    });
    return NextResponse.json(row ? serialize(row) : null);
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Upserts the single configuration row for a Service Product. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }

    const flags = {
      durationValue: data.durationValue ?? null,
      durationUnitId: data.durationUnitId != null ? BigInt(data.durationUnitId) : null,
      bookingModelId: data.bookingModelId != null ? BigInt(data.bookingModelId) : null,
      pricingModelId: data.pricingModelId != null ? BigInt(data.pricingModelId) : null,
      minimumPax: data.minimumPax ?? null,
      maximumPax: data.maximumPax ?? null,
      minimumAge: data.minimumAge ?? null,
      maximumAge: data.maximumAge ?? null,
      isInstantConfirmation: data.isInstantConfirmation ?? false,
      isRequestOnly: data.isRequestOnly ?? false,
      isDateRequired: data.isDateRequired ?? false,
      isTimeRequired: data.isTimeRequired ?? false,
      isPickupRequired: data.isPickupRequired ?? false,
      isDropoffRequired: data.isDropoffRequired ?? false,
      isScheduleRequired: data.isScheduleRequired ?? false,
      isAvailabilityRequired: data.isAvailabilityRequired ?? false,
      isItineraryRequired: data.isItineraryRequired ?? false,
      isCancellationPolicyRequired: data.isCancellationPolicyRequired ?? false,
    };

    const row = await prisma.serviceProductConfiguration.upsert({
      where: { serviceProductId: BigInt(data.serviceProductId) },
      create: {
        serviceProductId: BigInt(data.serviceProductId),
        ...flags,
        createdBy: data.actorId,
      },
      update: {
        ...flags,
        modifiedBy: data.actorId,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(row), { status: 200 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
