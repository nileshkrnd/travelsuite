import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const propertyContractWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyId: z.number().int().positive("Property is required"),
    supplierId: z.number().int().positive("Supplier is required"),
    contractNumber: z.string().trim().min(1, "Contract number is required").max(100),
    contractName: z.string().trim().min(1, "Contract name is required").max(200),
    contractTypeId: z.number().int().positive("Contract type is required"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
    contractCurrencyId: z.number().int().positive("Currency is required"),
    contractStatusId: z.number().int().positive("Contract status is required"),
    contractVersion: z.number().int().positive().optional(),
    signedDate: optionalDate,
    signedByEmployeeId: z.number().int().positive().nullable().optional(),
    supplierContactId: z.number().int().positive().nullable().optional(),
    paymentTerms: z.string().trim().max(4000).nullable().optional(),
    generalTerms: z.string().trim().max(4000).nullable().optional(),
    remarks: z.string().trim().max(4000).nullable().optional(),
    contractFileUrl: z.string().trim().max(500).nullable().optional(),
    contractFileName: z.string().trim().max(255).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.endDate < values.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date" });
    }
  });

export type PropertyContractWriteData = z.infer<typeof propertyContractWriteSchema>;

export const propertyContractInclude = {
  property: {
    select: {
      propertyName: true,
      propertyCode: true,
      country: { select: { countryName: true } },
      city: { select: { cityName: true } },
    },
  },
  supplier: { select: { supplierName: true } },
  contractType: { select: { name: true } },
  contractStatus: { select: { name: true } },
  currency: { select: { currencyCode: true } },
  signedByEmployee: { select: { title: true, firstName: true, lastName: true } },
  supplierContact: { select: { firstName: true, lastName: true } },
} as const;

type SerializableRow = {
  propertyContractId: bigint;
  supplierId: bigint;
  contractTypeId: bigint;
  contractStatusId: bigint;
  supplierContactId: bigint | null;
  [key: string]: unknown;
};

export function serializePropertyContractRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    propertyContractId: Number(row.propertyContractId),
    supplierId: Number(row.supplierId),
    contractTypeId: Number(row.contractTypeId),
    contractStatusId: Number(row.contractStatusId),
    supplierContactId: row.supplierContactId == null ? null : Number(row.supplierContactId),
  };
}

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function validatePropertyContractLookups(
  data: PropertyContractWriteData
): Promise<NextResponse | null> {
  const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({ where: { supplierId: BigInt(data.supplierId) } });
  if (!supplier || supplier.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Supplier not found for this tenant" }, { status: 400 });
  }

  const contractType = await prisma.contractType.findUnique({
    where: { contractTypeId: BigInt(data.contractTypeId) },
  });
  if (!contractType) return NextResponse.json({ error: "Contract type not found" }, { status: 400 });

  const contractStatus = await prisma.contractStatus.findUnique({
    where: { contractStatusId: BigInt(data.contractStatusId) },
  });
  if (!contractStatus) return NextResponse.json({ error: "Contract status not found" }, { status: 400 });

  const currency = await prisma.currency.findUnique({ where: { currencyId: data.contractCurrencyId } });
  if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 400 });

  if (data.signedByEmployeeId != null) {
    const employee = await prisma.employee.findUnique({ where: { employeeId: data.signedByEmployeeId } });
    if (!employee || employee.tenantId !== data.tenantId) {
      return NextResponse.json({ error: "Signing employee not found for this tenant" }, { status: 400 });
    }
  }

  if (data.supplierContactId != null) {
    const contact = await prisma.supplierUser.findUnique({
      where: { supplierUserId: BigInt(data.supplierContactId) },
    });
    if (!contact || contact.supplierId !== BigInt(data.supplierId)) {
      return NextResponse.json({ error: "Supplier contact does not belong to this supplier" }, { status: 400 });
    }
  }

  return null;
}

function scalars(data: PropertyContractWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyId: data.propertyId,
    supplierId: BigInt(data.supplierId),
    contractNumber: data.contractNumber,
    contractName: data.contractName,
    contractTypeId: BigInt(data.contractTypeId),
    startDate: parseDateOnly(data.startDate) as Date,
    endDate: parseDateOnly(data.endDate) as Date,
    contractCurrencyId: data.contractCurrencyId,
    contractStatusId: BigInt(data.contractStatusId),
    contractVersion: data.contractVersion ?? 1,
    signedDate: parseDateOnly(data.signedDate) ?? null,
    signedByEmployeeId: data.signedByEmployeeId ?? null,
    supplierContactId: data.supplierContactId != null ? BigInt(data.supplierContactId) : null,
    paymentTerms: data.paymentTerms?.trim() || null,
    generalTerms: data.generalTerms?.trim() || null,
    remarks: data.remarks?.trim() || null,
    contractFileUrl: data.contractFileUrl?.trim() || null,
    contractFileName: data.contractFileName?.trim() || null,
  };
}

export function toPropertyContractCreateData(
  data: PropertyContractWriteData & { createdBy: number }
): Prisma.PropertyContractUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyContractUpdateScalars(
  data: PropertyContractWriteData & { modifiedBy: number }
): Prisma.PropertyContractUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
