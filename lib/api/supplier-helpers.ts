import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null || v === "" ? null : v));

export const supplierWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  supplierName: z.string().trim().min(1, "Supplier name is required").max(200),
  supplierLegalName: z.string().trim().min(1, "Legal name is required").max(250),
  supplierTypeId: z.number().int().positive("Supplier type is required"),
  registrationNumber: optionalText(100),
  taxVatNumber: optionalText(100),
  countryId: z.number().int().positive("Country is required"),
  stateId: z.union([z.number().int().positive(), z.null()]).optional(),
  cityId: z.number().int().positive("City is required"),
  address: z.string().trim().min(1, "Address is required").max(20000),
  postalCode: optionalText(20),
  website: optionalText(250),
  currencyId: z.number().int().positive("Currency is required"),
  timeZoneId: z.number().int().positive("Time zone is required"),
  requiresExtranetAccess: z.boolean(),
  isActive: z.boolean().optional(),
});

export const supplierInclude = {
  supplierType: { select: { supplierTypeName: true } },
  country: { select: { countryName: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
  currency: { select: { currencyCode: true } },
} as const;

type SerializableSupplier = {
  supplierId: bigint;
  supplierTypeId: bigint;
  [key: string]: unknown;
};

/** Supplier's BigInt id/type FK can't pass through NextResponse.json() (JSON.stringify throws on bigint) — convert to number first. */
export function serializeSupplierRow<T extends SerializableSupplier>(row: T) {
  return {
    ...row,
    supplierId: Number(row.supplierId),
    supplierTypeId: Number(row.supplierTypeId),
  };
}

export async function withCompanyName<T extends { companyId: number }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId))];
  if (companyIds.length === 0) return rows.map((r) => ({ ...r, companyName: null as string | null }));
  const companies = await prisma.company.findMany({
    where: { companyId: { in: companyIds } },
    select: { companyId: true, companyName: true },
  });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({ ...r, companyName: nameById.get(r.companyId) ?? null }));
}

function trimOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const t = value.trim();
  return t || null;
}

export async function validateSupplierLookups(data: {
  tenantId: number;
  companyId: number;
  supplierTypeId: number;
  countryId: number;
  stateId?: number | null;
  cityId: number;
  currencyId: number;
}): Promise<NextResponse | null> {
  const company = await prisma.company.findFirst({
    where: { companyId: data.companyId, tenantId: data.tenantId },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
  }

  const supplierType = await prisma.supplierType.findUnique({
    where: { supplierTypeId: BigInt(data.supplierTypeId) },
  });
  if (!supplierType) return NextResponse.json({ error: "Supplier type not found" }, { status: 400 });

  const country = await prisma.country.findUnique({ where: { countryId: data.countryId } });
  if (!country) return NextResponse.json({ error: "Country not found" }, { status: 400 });

  if (data.stateId != null) {
    const state = await prisma.state.findUnique({ where: { stateId: data.stateId } });
    if (!state || state.countryId !== data.countryId) {
      return NextResponse.json({ error: "State does not belong to the selected country" }, { status: 400 });
    }
  }

  const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
  if (!city || city.countryId !== data.countryId) {
    return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
  }

  const currency = await prisma.currency.findUnique({ where: { currencyId: data.currencyId } });
  if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 400 });

  return null;
}

/** Generates the next SupplierCode for a tenant, e.g. SUP000001. Called inside the same transaction as the create. */
export async function generateSupplierCode(
  tx: Prisma.TransactionClient,
  tenantId: number
): Promise<string> {
  const count = await tx.supplier.count({ where: { tenantId } });
  return `SUP${String(count + 1).padStart(6, "0")}`;
}

type WriteData = z.infer<typeof supplierWriteSchema>;

function scalars(data: WriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    supplierName: data.supplierName.trim(),
    supplierLegalName: data.supplierLegalName.trim(),
    supplierTypeId: BigInt(data.supplierTypeId),
    registrationNumber: trimOrNull(data.registrationNumber) ?? null,
    taxVatNumber: trimOrNull(data.taxVatNumber) ?? null,
    countryId: data.countryId,
    stateId: data.stateId ?? null,
    cityId: data.cityId,
    address: data.address.trim(),
    postalCode: trimOrNull(data.postalCode) ?? null,
    website: trimOrNull(data.website) ?? null,
    currencyId: data.currencyId,
    timeZoneId: data.timeZoneId,
    requiresExtranetAccess: data.requiresExtranetAccess,
  };
}

export function toSupplierCreateData(
  data: WriteData & { supplierCode: string; createdBy: number }
): Prisma.SupplierUncheckedCreateInput {
  return {
    ...scalars(data),
    supplierCode: data.supplierCode,
    isActive: data.isActive ?? true,
    createdBy: data.createdBy,
  };
}

export function toSupplierUpdateScalars(
  data: WriteData & { modifiedBy: number }
): Prisma.SupplierUncheckedUpdateInput {
  return {
    ...scalars(data),
    isActive: data.isActive,
    modifiedBy: data.modifiedBy,
    modifiedDtTm: new Date(),
  };
}
