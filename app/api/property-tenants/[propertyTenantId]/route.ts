import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ propertyTenantId: string }> };

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyTenantId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });

    const row = await prisma.propertyTenant.findUnique({ where: { propertyTenantId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Property tenant not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyTenantId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const type = await prisma.propertyTenantTypeMaster.findUnique({ where: { propertyTenantTypeId: BigInt(data.propertyTenantTypeId) } });
    if (!type) return NextResponse.json({ error: "Property tenant type not found" }, { status: 400 });

    const updated = await prisma.propertyTenant.update({
      where: { propertyTenantId: BigInt(id.data) },
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
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Property tenant not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This tenant code already exists for this company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyTenantId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyTenant.update({
      where: { propertyTenantId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Property tenant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyTenantId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });

    await prisma.propertyTenant.delete({ where: { propertyTenantId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Property tenant not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "";
    if (/23001|23503|violates[\s\S]*foreign key constraint/i.test(message)) {
      return NextResponse.json({ error: "This tenant has related documents/addresses and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
