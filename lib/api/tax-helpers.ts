import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

export const taxWriteSchema = z
  .object({
    tenantId: z.number().int().positive().nullable().optional(),
    companyId: z.number().int().positive().nullable().optional(),
    taxTypeId: z.number().int().positive("Tax type is required"),
    taxCode: z.string().trim().min(1).max(50),
    taxName: z.string().trim().min(1).max(200),
    countryId: z.number().int().positive().nullable().optional(),
    regionId: z.number().int().positive().nullable().optional(),
    calculationType: z.enum(["PERCENTAGE", "FIXED"]),
    defaultRate: z.number().min(0).nullable().optional(),
    defaultAmount: z.number().min(0).nullable().optional(),
    currencyId: z.number().int().positive().nullable().optional(),
    applicationBasis: z.string().trim().min(1).max(50),
    isInclusiveDefault: z.boolean().optional(),
    isCompound: z.boolean().optional(),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.calculationType !== "PERCENTAGE" || v.defaultRate != null, {
    message: "Default rate is required for a percentage tax",
    path: ["defaultRate"],
  })
  .refine((v) => v.calculationType !== "FIXED" || v.defaultAmount != null, {
    message: "Default amount is required for a fixed tax",
    path: ["defaultAmount"],
  })
  .refine((v) => !v.effectiveFrom || !v.effectiveTo || v.effectiveFrom <= v.effectiveTo, {
    message: "Effective from must be on or before effective to",
    path: ["effectiveTo"],
  });

export type TaxWriteData = z.infer<typeof taxWriteSchema>;

export const taxInclude = {
  taxType: { select: { taxTypeCode: true, taxTypeName: true } },
  country: { select: { countryCode: true, countryName: true } },
  region: { select: { regionCode: true, regionName: true } },
  currency: { select: { currencyCode: true } },
};

type TaxRow = {
  taxId: bigint;
  tenantId: number | null;
  companyId: number | null;
  taxTypeId: bigint;
  countryId: number | null;
  regionId: number | null;
  currencyId: number | null;
  defaultRate: unknown;
  defaultAmount: unknown;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  taxType?: { taxTypeCode: string; taxTypeName: string } | null;
  country?: { countryCode: string; countryName: string } | null;
  region?: { regionCode: string; regionName: string } | null;
  currency?: { currencyCode: string } | null;
  [key: string]: unknown;
};

function decimalOrNull(value: unknown): number | null {
  if (value == null) return null;
  return Number((value as { toString(): string }).toString());
}

function toDateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function serializeTaxRow(row: TaxRow) {
  const { taxId, taxTypeId, countryId, regionId, currencyId, defaultRate, defaultAmount, effectiveFrom, effectiveTo, ...rest } =
    row;

  return {
    ...rest,
    taxId: Number(taxId),
    taxTypeId: Number(taxTypeId),
    countryId,
    regionId,
    currencyId,
    defaultRate: decimalOrNull(defaultRate),
    defaultAmount: decimalOrNull(defaultAmount),
    effectiveFrom: toDateOnly(effectiveFrom),
    effectiveTo: toDateOnly(effectiveTo),
    taxTypeCode: row.taxType?.taxTypeCode,
    taxTypeName: row.taxType?.taxTypeName,
    countryCode: row.country?.countryCode,
    countryName: row.country?.countryName,
    regionCode: row.region?.regionCode,
    regionName: row.region?.regionName,
    currencyCode: row.currency?.currencyCode,
  };
}

export async function validateTaxLookups(data: TaxWriteData): Promise<NextResponse | null> {
  const taxType = await prisma.taxType.findUnique({ where: { taxTypeId: BigInt(data.taxTypeId) } });
  if (!taxType || !taxType.isActive) {
    return NextResponse.json({ error: "Tax type not found" }, { status: 400 });
  }
  if (data.tenantId != null && (taxType.tenantId !== data.tenantId || taxType.companyId !== data.companyId)) {
    return NextResponse.json({ error: "Tax type does not belong to this tenant" }, { status: 400 });
  }

  if (data.countryId != null && data.countryId > 0) {
    const country = await prisma.country.findUnique({ where: { countryId: data.countryId } });
    if (!country) return NextResponse.json({ error: "Country not found" }, { status: 400 });
  }

  if (data.regionId != null && data.regionId > 0) {
    const region = await prisma.region.findUnique({ where: { regionId: data.regionId } });
    if (!region) return NextResponse.json({ error: "Region not found" }, { status: 400 });
  }

  if (data.currencyId != null && data.currencyId > 0) {
    const currency = await prisma.currency.findUnique({ where: { currencyId: data.currencyId } });
    if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 400 });
  }

  return null;
}

export function taxScalars(data: TaxWriteData) {
  return {
    tenantId: data.tenantId ?? null,
    companyId: data.companyId ?? null,
    taxTypeId: BigInt(data.taxTypeId),
    taxCode: data.taxCode.trim().toUpperCase(),
    taxName: data.taxName.trim(),
    countryId: data.countryId != null && data.countryId > 0 ? data.countryId : null,
    regionId: data.regionId != null && data.regionId > 0 ? data.regionId : null,
    calculationType: data.calculationType,
    defaultRate: data.calculationType === "PERCENTAGE" ? (data.defaultRate ?? null) : null,
    defaultAmount: data.calculationType === "FIXED" ? (data.defaultAmount ?? null) : null,
    currencyId: data.currencyId != null && data.currencyId > 0 ? data.currencyId : null,
    applicationBasis: data.applicationBasis,
    isInclusiveDefault: data.isInclusiveDefault ?? false,
    isCompound: data.isCompound ?? false,
    effectiveFrom: data.effectiveFrom ? parseDateOnly(data.effectiveFrom) : null,
    effectiveTo: data.effectiveTo ? parseDateOnly(data.effectiveTo) : null,
  };
}
