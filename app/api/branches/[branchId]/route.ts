import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppBranch, type BranchRow } from "@/lib/mappers/branch.mapper";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

const branchInclude = {
  branchType: { select: { branchTypeName: true } },
  company: { select: { companyUid: true, companyName: true, tenantId: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
} as const;

type RouteContext = { params: Promise<{ branchId: string }> };

async function attachTenantUid<T extends { company?: { tenantId: number } | null }>(row: T) {
  if (!row.company) return { ...row, tenantUid: undefined };
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId: row.company.tenantId },
    select: { tenantUid: true },
  });
  return { ...row, tenantUid: tenant?.tenantUid };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { branchId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });

    const row = await prisma.branch.findUnique({
      where: { branchId: id.data },
      include: branchInclude,
    });
    if (!row) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    return NextResponse.json(toAppBranch((await attachTenantUid(row)) as BranchRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { branchId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });

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

    const updated = await prisma.branch.update({
      where: { branchId: id.data },
      data: {
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
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: branchInclude,
    });
    return NextResponse.json(toAppBranch((await attachTenantUid(updated)) as BranchRow));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Branch not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This branch name already exists for the company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { branchId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.branch.update({
      where: { branchId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: branchInclude,
    });
    return NextResponse.json(toAppBranch((await attachTenantUid(updated)) as BranchRow));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
