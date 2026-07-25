import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppBranch, type BranchRow } from "@/lib/mappers/branch.mapper";

const createSchema = z.object({
  branchUid: z.string().trim().min(1).max(100).optional(),
  branchTypeId: z.number().int().positive(),
  branchName: z.string().trim().min(1).max(100),
  companyId: z.number().int().positive(),
  address1: z.string().trim().min(1).max(200),
  address2: z.string().trim().max(200).optional(),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  zipCode: z.string().trim().min(1).max(10),
  contactPerson: z.string().trim().min(1).max(200),
  emailAddress: z.string().trim().email().max(100),
  countryDialCode: z.string().trim().min(1).max(5),
  phoneNumber: z.string().trim().min(1).max(20),
  faxNumber: z.string().trim().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const branchInclude = {
  branchType: { select: { branchTypeName: true } },
  company: { select: { companyUid: true, companyName: true, tenantId: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
} as const;

async function withTenantUid<T extends { company?: { tenantId: number } | null }>(rows: T[]) {
  const tenantIds = [...new Set(rows.map((r) => r.company?.tenantId).filter((id): id is number => !!id))];
  const tenants = await prisma.tenant.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, tenantUid: true },
  });
  const map = new Map(tenants.map((t) => [t.tenantId, t.tenantUid]));
  return rows.map((row) => ({ ...row, tenantUid: row.company ? map.get(row.company.tenantId) : undefined }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");
    const tenantIdParam = searchParams.get("tenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.BranchWhereInput = {};
    if (companyIdParam != null && companyIdParam !== "") {
      where.companyId = Number(companyIdParam);
    } else if (tenantIdParam != null && tenantIdParam !== "") {
      where.company = { tenantId: Number(tenantIdParam) };
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.branch.findMany({
      where,
      include: branchInclude,
      orderBy: { branchName: "asc" },
    });
    const withTenant = await withTenantUid(rows);
    return NextResponse.json(withTenant.map((row) => toAppBranch(row as BranchRow)));
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
    const company = await prisma.company.findUnique({ where: { companyId: data.companyId } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 400 });

    const branchType = await prisma.branchType.findUnique({ where: { branchTypeId: data.branchTypeId } });
    if (!branchType) return NextResponse.json({ error: "Branch type not found" }, { status: 400 });

    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city || city.countryId !== data.countryId) {
      return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
    }

    const branchUid =
      data.branchUid?.trim() ||
      `branch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const created = await prisma.branch.create({
      data: {
        branchUid,
        branchTypeId: data.branchTypeId,
        branchName: data.branchName.trim(),
        companyId: data.companyId,
        address1: data.address1.trim(),
        address2: (data.address2 ?? "").trim(),
        countryId: data.countryId,
        cityId: data.cityId,
        zipCode: data.zipCode.trim(),
        contactPerson: data.contactPerson.trim(),
        emailAddress: data.emailAddress.trim(),
        countryDialCode: data.countryDialCode.trim(),
        phoneNumber: data.phoneNumber.trim(),
        faxNumber: data.faxNumber?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: branchInclude,
    });

    const tenant = await prisma.tenant.findUnique({ where: { tenantId: company.tenantId } });
    return NextResponse.json(
      toAppBranch({ ...created, tenantUid: tenant?.tenantUid } as BranchRow),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This branch name already exists for the company" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
