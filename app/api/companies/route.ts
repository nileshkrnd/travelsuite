import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  companyUid: z.string().trim().min(1).max(100).optional(),
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
  tenantId: z.number().int().positive(),
  companyLogo: z.string().trim().max(100).optional(),
  companyFavIcon: z.string().trim().max(100).optional(),
  createdBy: z.number().int().positive(),
});

const companyInclude = {
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
  currency: { select: { currencyCode: true } },
} as const;

async function withTenantUid<T extends { tenantId: number }>(rows: T[]) {
  const tenantIds = [...new Set(rows.map((r) => r.tenantId))];
  const tenants = await prisma.tenant.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, tenantUid: true },
  });
  const map = new Map(tenants.map((t) => [t.tenantId, t.tenantUid]));
  return rows.map((row) => ({ ...row, tenantUid: map.get(row.tenantId) }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.CompanyWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") {
      where.tenantId = Number(tenantIdParam);
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.company.findMany({
      where,
      include: companyInclude,
      orderBy: { companyName: "asc" },
    });
    return NextResponse.json(await withTenantUid(rows));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const tenant = await prisma.tenant.findUnique({ where: { tenantId: data.tenantId } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 400 });

    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city || city.countryId !== data.countryId) {
      return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
    }

    const currency = await prisma.currency.findUnique({ where: { currencyId: data.currencyId } });
    if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 400 });

    const companyUid =
      data.companyUid?.trim() ||
      `company_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const created = await prisma.company.create({
      data: {
        companyUid,
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
        isActive: data.isActive ?? true,
        isRoundOff: data.isRoundOff ?? false,
        noOfSignificantDigits: data.noOfSignificantDigits ?? 2,
        isDisplayNumberInThousands: data.isDisplayNumberInThousands ?? null,
        tenantId: data.tenantId,
        companyLogo: (data.companyLogo ?? "").trim(),
        companyFavIcon: (data.companyFavIcon ?? "").trim(),
        createdBy: data.createdBy,
      },
      include: companyInclude,
    });

    return NextResponse.json({ ...created, tenantUid: tenant.tenantUid }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This company code or uid already exists for the tenant" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
