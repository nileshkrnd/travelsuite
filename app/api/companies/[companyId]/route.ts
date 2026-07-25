import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  companyGroupId: z.number().int().positive().nullable().optional(),
  companyCode: z.string().trim().min(1).max(20),
  companyName: z.string().trim().min(1).max(200),
  address1: z.string().trim().min(1).max(200),
  address2: z.string().trim().max(200).optional(),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  zipCode: z.string().trim().min(1).max(50),
  countryDialCode: z.string().trim().min(1).max(5),
  contactNumber: z.string().trim().max(20).nullable().optional(),
  fax: z.string().trim().max(50).nullable().optional(),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  emailAddress: z.string().trim().email().max(200).nullable().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isRoundOff: z.boolean().optional(),
  noOfSignificantDigits: z.number().int().min(0).max(10).optional(),
  isDisplayNumberInThousands: z.boolean().nullable().optional(),
  companyLogo: z.string().trim().max(100).optional(),
  companyFavIcon: z.string().trim().max(100).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

const companyInclude = {
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
  currency: { select: { currencyCode: true } },
} as const;

type RouteContext = { params: Promise<{ companyId: string }> };

async function attachTenantUid<T extends { tenantId: number }>(row: T) {
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId: row.tenantId },
    select: { tenantUid: true },
  });
  return { ...row, tenantUid: tenant?.tenantUid };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

    const row = await prisma.company.findUnique({
      where: { companyId: id.data },
      include: companyInclude,
    });
    if (!row) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json(await attachTenantUid(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { companyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city || city.countryId !== data.countryId) {
      return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
    }

    const updated = await prisma.company.update({
      where: { companyId: id.data },
      data: {
        companyGroupId: data.companyGroupId ?? null,
        companyCode: data.companyCode.trim(),
        companyName: data.companyName.trim(),
        address1: data.address1.trim(),
        address2: (data.address2 ?? "").trim(),
        countryId: data.countryId,
        cityId: data.cityId,
        currencyId: data.currencyId,
        zipCode: data.zipCode.trim(),
        countryDialCode: data.countryDialCode.trim(),
        contactNumber: data.contactNumber?.trim() || null,
        fax: data.fax?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        emailAddress: data.emailAddress?.trim() || null,
        isActive: data.isActive,
        isRoundOff: data.isRoundOff ?? false,
        noOfSignificantDigits: data.noOfSignificantDigits ?? 2,
        isDisplayNumberInThousands: data.isDisplayNumberInThousands ?? null,
        companyLogo: (data.companyLogo ?? "").trim(),
        companyFavIcon: (data.companyFavIcon ?? "").trim(),
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: companyInclude,
    });
    return NextResponse.json(await attachTenantUid(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Company not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This company code already exists for the tenant" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { companyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.company.update({
      where: { companyId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: companyInclude,
    });
    return NextResponse.json(await attachTenantUid(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
