import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const upsertSchema = z.object({
  serviceTypeId: z.number().int().positive(),
  isDurationApplicable: z.boolean().optional(),
  isBookingModelApplicable: z.boolean().optional(),
  isPricingModelApplicable: z.boolean().optional(),
  isPaxApplicable: z.boolean().optional(),
  isAgeApplicable: z.boolean().optional(),
  isPickupApplicable: z.boolean().optional(),
  isDropoffApplicable: z.boolean().optional(),
  isScheduleApplicable: z.boolean().optional(),
  isAvailabilityApplicable: z.boolean().optional(),
  isItineraryApplicable: z.boolean().optional(),
  isCancellationApplicable: z.boolean().optional(),
  isOnlineSellable: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  actorId: z.number().int().positive(),
});

const rowInclude = { serviceType: { select: { serviceTypeName: true } } } as const;

function serialize<T extends { serviceTypeConfigurationId: bigint; serviceTypeId: bigint }>(row: T) {
  return { ...row, serviceTypeConfigurationId: Number(row.serviceTypeConfigurationId), serviceTypeId: Number(row.serviceTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const serviceTypeIdParam = searchParams.get("serviceTypeId");

    const where: Prisma.ServiceTypeConfigurationWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (serviceTypeIdParam != null && serviceTypeIdParam !== "") where.serviceTypeId = BigInt(serviceTypeIdParam);

    const rows = await prisma.serviceTypeConfiguration.findMany({ where, include: rowInclude });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Upserts the single configuration row for (tenantId, companyId, serviceTypeId). */
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

    const serviceType = await prisma.serviceTypeMaster.findUnique({ where: { serviceTypeId: BigInt(data.serviceTypeId) } });
    if (!serviceType) {
      return NextResponse.json({ error: "Service type not found" }, { status: 400 });
    }

    const flags = {
      isDurationApplicable: data.isDurationApplicable ?? false,
      isBookingModelApplicable: data.isBookingModelApplicable ?? false,
      isPricingModelApplicable: data.isPricingModelApplicable ?? false,
      isPaxApplicable: data.isPaxApplicable ?? false,
      isAgeApplicable: data.isAgeApplicable ?? false,
      isPickupApplicable: data.isPickupApplicable ?? false,
      isDropoffApplicable: data.isDropoffApplicable ?? false,
      isScheduleApplicable: data.isScheduleApplicable ?? false,
      isAvailabilityApplicable: data.isAvailabilityApplicable ?? false,
      isItineraryApplicable: data.isItineraryApplicable ?? false,
      isCancellationApplicable: data.isCancellationApplicable ?? false,
      isOnlineSellable: data.isOnlineSellable ?? false,
    };

    const row = await prisma.serviceTypeConfiguration.upsert({
      where: {
        tenantId_companyId_serviceTypeId: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          serviceTypeId: BigInt(data.serviceTypeId),
        },
      },
      create: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        serviceTypeId: BigInt(data.serviceTypeId),
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
