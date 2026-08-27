import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  tenantCode: z.string().trim().min(1).max(50),
  propertyTenantTypeId: z.number().int().positive(),
  tenantName: z.string().trim().min(1).max(250),
  legalName: z.string().trim().max(250).nullable().optional(),
  registrationNumber: z.string().trim().max(100).nullable().optional(),
  taxRegistrationNumber: z.string().trim().max(100).nullable().optional(),
  nationalityId: z.number().int().positive().nullable().optional(),
  countryOfResidenceId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive().nullable().optional(),
  contactPersonName: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  mobileCountryCode: z.string().trim().max(10).nullable().optional(),
  mobileNumber: z.string().trim().max(30).nullable().optional(),
  statusId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  tenantType: { select: { tenantTypeName: true } },
  nationality: { select: { countryName: true } },
  countryOfResidence: { select: { countryName: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
  status: { select: { statusName: true } },
} as const;

function serialize<T extends { propertyTenantId: bigint; propertyTenantTypeId: bigint; statusId: bigint }>(row: T) {
  return { ...row, propertyTenantId: Number(row.propertyTenantId), propertyTenantTypeId: Number(row.propertyTenantTypeId), statusId: Number(row.statusId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const typeIdParam = searchParams.get("propertyTenantTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyTenantWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (typeIdParam != null && typeIdParam !== "") where.propertyTenantTypeId = BigInt(typeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyTenant.findMany({
      where,
      include: rowInclude,
      orderBy: [{ tenantName: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
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

    const type = await prisma.propertyTenantTypeMaster.findUnique({ where: { propertyTenantTypeId: BigInt(data.propertyTenantTypeId) } });
    if (!type) return NextResponse.json({ error: "Property tenant type not found" }, { status: 400 });

    const created = await prisma.propertyTenant.create({
      data: {
        tenantCode: data.tenantCode.trim().toUpperCase(),
        propertyTenantTypeId: BigInt(data.propertyTenantTypeId),
        tenantName: data.tenantName.trim(),
        legalName: data.legalName?.trim() || null,
        registrationNumber: data.registrationNumber?.trim() || null,
        taxRegistrationNumber: data.taxRegistrationNumber?.trim() || null,
        nationalityId: data.nationalityId ?? null,
        countryOfResidenceId: data.countryOfResidenceId ?? null,
        countryId: data.countryId,
        cityId: data.cityId ?? null,
        contactPersonName: data.contactPersonName?.trim() || null,
        email: data.email?.trim() || null,
        mobileCountryCode: data.mobileCountryCode?.trim() || null,
        mobileNumber: data.mobileNumber?.trim() || null,
        statusId: BigInt(data.statusId),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This tenant code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
