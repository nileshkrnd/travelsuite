import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const upsertSchema = z.object({
  serviceProductClassificationId: z.number().int().positive(),
  isDurationApplicable: z.boolean().nullable().optional(),
  isBookingModelApplicable: z.boolean().nullable().optional(),
  isPricingModelApplicable: z.boolean().nullable().optional(),
  isPaxApplicable: z.boolean().nullable().optional(),
  isAgeApplicable: z.boolean().nullable().optional(),
  isPickupApplicable: z.boolean().nullable().optional(),
  isDropoffApplicable: z.boolean().nullable().optional(),
  isScheduleApplicable: z.boolean().nullable().optional(),
  isAvailabilityApplicable: z.boolean().nullable().optional(),
  isItineraryApplicable: z.boolean().nullable().optional(),
  isCancellationApplicable: z.boolean().nullable().optional(),
  isOnlineSellable: z.boolean().nullable().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  actorId: z.number().int().positive(),
});

const rowInclude = { classification: { select: { classificationName: true } } } as const;

function serialize<T extends { serviceProductClassificationConfigurationId: bigint; serviceProductClassificationId: bigint }>(
  row: T
) {
  return {
    ...row,
    serviceProductClassificationConfigurationId: Number(row.serviceProductClassificationConfigurationId),
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const classificationIdParam = searchParams.get("serviceProductClassificationId");

    const where: Prisma.ServiceProductClassificationConfigurationWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (classificationIdParam != null && classificationIdParam !== "") {
      where.serviceProductClassificationId = BigInt(classificationIdParam);
    }

    const rows = await prisma.serviceProductClassificationConfiguration.findMany({ where, include: rowInclude });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Upserts the single configuration row for (tenantId, companyId, serviceProductClassificationId). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const company = await prisma.company.findFirst({ where: { companyId: data.companyId, tenantId: data.tenantId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const classification = await prisma.serviceProductClassificationMaster.findUnique({
      where: { serviceProductClassificationId: BigInt(data.serviceProductClassificationId) },
    });
    if (!classification) {
      return NextResponse.json({ error: "Classification not found" }, { status: 400 });
    }

    const flags = {
      isDurationApplicable: data.isDurationApplicable ?? null,
      isBookingModelApplicable: data.isBookingModelApplicable ?? null,
      isPricingModelApplicable: data.isPricingModelApplicable ?? null,
      isPaxApplicable: data.isPaxApplicable ?? null,
      isAgeApplicable: data.isAgeApplicable ?? null,
      isPickupApplicable: data.isPickupApplicable ?? null,
      isDropoffApplicable: data.isDropoffApplicable ?? null,
      isScheduleApplicable: data.isScheduleApplicable ?? null,
      isAvailabilityApplicable: data.isAvailabilityApplicable ?? null,
      isItineraryApplicable: data.isItineraryApplicable ?? null,
      isCancellationApplicable: data.isCancellationApplicable ?? null,
      isOnlineSellable: data.isOnlineSellable ?? null,
    };

    const row = await prisma.serviceProductClassificationConfiguration.upsert({
      where: {
        tenantId_companyId_serviceProductClassificationId: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          serviceProductClassificationId: BigInt(data.serviceProductClassificationId),
        },
      },
      create: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        serviceProductClassificationId: BigInt(data.serviceProductClassificationId),
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
