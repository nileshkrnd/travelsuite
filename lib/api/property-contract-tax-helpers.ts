import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

export const propertyContractTaxWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyContractId: z.number().int().positive("Contract is required"),
    taxId: z.number().int().positive("Tax is required"),
    taxName: z.string().trim().min(1).max(200),
    calculationType: z.enum(["PERCENTAGE", "FIXED"]),
    taxRate: z.number().min(0).nullable().optional(),
    taxAmount: z.number().min(0).nullable().optional(),
    currencyId: z.number().int().positive().nullable().optional(),
    applicationBasis: z.string().trim().min(1).max(50),
    isInclusive: z.boolean().optional(),
    isCompound: z.boolean().optional(),
    sequenceNo: z.number().int().min(0).optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
    remarks: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => v.calculationType !== "PERCENTAGE" || v.taxRate != null, {
    message: "Tax rate is required for a percentage tax",
    path: ["taxRate"],
  })
  .refine((v) => v.calculationType !== "FIXED" || v.taxAmount != null, {
    message: "Tax amount is required for a fixed tax",
    path: ["taxAmount"],
  })
  .refine((v) => !v.toDate || v.fromDate <= v.toDate, {
    message: "From date must be on or before to date",
    path: ["toDate"],
  });

export type PropertyContractTaxWriteData = z.infer<typeof propertyContractTaxWriteSchema>;

export const propertyContractTaxInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  tax: { select: { taxCode: true } },
  currency: { select: { currencyCode: true } },
};

type PropertyContractTaxRow = {
  propertyContractTaxId: bigint;
  propertyContractId: bigint;
  taxId: bigint;
  currencyId: number | null;
  taxRate: unknown;
  taxAmount: unknown;
  fromDate: Date;
  toDate: Date | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  tax?: { taxCode: string } | null;
  currency?: { currencyCode: string } | null;
  [key: string]: unknown;
};

function decimalOrNull(value: unknown): number | null {
  if (value == null) return null;
  return Number((value as { toString(): string }).toString());
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
function toDateOnlyNullable(value: Date | null): string | null {
  return value ? toDateOnly(value) : null;
}

export function serializePropertyContractTaxRow(row: PropertyContractTaxRow) {
  const { propertyContractTaxId, propertyContractId, taxId, currencyId, taxRate, taxAmount, fromDate, toDate, ...rest } =
    row;

  return {
    ...rest,
    propertyContractTaxId: Number(propertyContractTaxId),
    propertyContractId: Number(propertyContractId),
    taxId: Number(taxId),
    currencyId,
    taxRate: decimalOrNull(taxRate),
    taxAmount: decimalOrNull(taxAmount),
    fromDate: toDateOnly(fromDate),
    toDate: toDateOnlyNullable(toDate),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    taxCode: row.tax?.taxCode,
    currencyCode: row.currency?.currencyCode,
  };
}

export async function validatePropertyContractTaxLookups(
  data: PropertyContractTaxWriteData
): Promise<NextResponse | null> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(data.propertyContractId) },
  });
  if (!contract || contract.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Contract not found for this tenant" }, { status: 400 });
  }
  if (contract.companyId !== data.companyId) {
    return NextResponse.json({ error: "Contract does not belong to this company" }, { status: 400 });
  }

  const tax = await prisma.tax.findUnique({ where: { taxId: BigInt(data.taxId) } });
  if (!tax || !tax.isActive) {
    return NextResponse.json({ error: "Tax not found" }, { status: 400 });
  }
  if (tax.tenantId != null && tax.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Tax does not belong to this tenant" }, { status: 400 });
  }

  if (data.currencyId != null && data.currencyId > 0) {
    const currency = await prisma.currency.findUnique({ where: { currencyId: data.currencyId } });
    if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 400 });
  }

  return null;
}

function taxScalars(data: PropertyContractTaxWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    taxId: BigInt(data.taxId),
    taxName: data.taxName.trim(),
    calculationType: data.calculationType,
    taxRate: data.calculationType === "PERCENTAGE" ? (data.taxRate ?? null) : null,
    taxAmount: data.calculationType === "FIXED" ? (data.taxAmount ?? null) : null,
    currencyId: data.currencyId != null && data.currencyId > 0 ? data.currencyId : null,
    applicationBasis: data.applicationBasis,
    isInclusive: data.isInclusive ?? false,
    isCompound: data.isCompound ?? false,
    sequenceNo: data.sequenceNo ?? 0,
    fromDate: parseDateOnly(data.fromDate),
    toDate: data.toDate ? parseDateOnly(data.toDate) : null,
    remarks: data.remarks?.trim() || null,
  };
}

export async function createPropertyContractTax(data: PropertyContractTaxWriteData & { createdBy: number }) {
  const created = await prisma.propertyContractTax.create({
    data: {
      ...taxScalars(data),
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
    },
  });
  return prisma.propertyContractTax.findUniqueOrThrow({
    where: { propertyContractTaxId: created.propertyContractTaxId },
    include: propertyContractTaxInclude,
  });
}

export async function updatePropertyContractTax(
  propertyContractTaxId: bigint,
  data: PropertyContractTaxWriteData & { modifiedBy: number }
) {
  await prisma.propertyContractTax.update({
    where: { propertyContractTaxId },
    data: {
      ...taxScalars(data),
      isActive: data.isActive,
      modifiedBy: data.modifiedBy,
      modifiedDtTm: new Date(),
    },
  });
  return prisma.propertyContractTax.findUniqueOrThrow({
    where: { propertyContractTaxId },
    include: propertyContractTaxInclude,
  });
}
