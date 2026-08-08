import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const propertySupplierWriteSchema = z
  .object({
    propertyId: z.number().int().positive("Property is required"),
    supplierId: z.number().int().positive("Supplier is required"),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });

export const propertySupplierInclude = {
  property: { select: { propertyCode: true, propertyName: true } },
  supplier: { select: { supplierCode: true, supplierName: true } },
} as const;

type SerializableRow = { propertySupplierId: bigint; supplierId: bigint; [key: string]: unknown };

export function serializePropertySupplierRow<T extends SerializableRow>(row: T) {
  return { ...row, propertySupplierId: Number(row.propertySupplierId), supplierId: Number(row.supplierId) };
}

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function validatePropertySupplierLookups(data: {
  propertyId: number;
  supplierId: number;
}): Promise<NextResponse | null> {
  const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

  const supplier = await prisma.supplier.findFirst({
    where: { supplierId: BigInt(data.supplierId), isDeleted: false },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

  if (property.tenantId != null && property.tenantId !== supplier.tenantId) {
    return NextResponse.json(
      { error: "This supplier belongs to a different tenant than the property" },
      { status: 400 }
    );
  }

  return null;
}

type WriteData = z.infer<typeof propertySupplierWriteSchema>;

function scalars(data: WriteData) {
  return {
    propertyId: data.propertyId,
    supplierId: BigInt(data.supplierId),
    validFrom: parseDateOnly(data.validFrom) ?? null,
    validTo: parseDateOnly(data.validTo) ?? null,
  };
}

export function toPropertySupplierCreateData(
  data: WriteData & { createdBy: number }
): Prisma.PropertySupplierUncheckedCreateInput {
  return {
    ...scalars(data),
    isPrimary: data.isPrimary ?? false,
    isActive: data.isActive ?? true,
    createdBy: data.createdBy,
  };
}

export function toPropertySupplierUpdateScalars(
  data: WriteData
): Prisma.PropertySupplierUncheckedUpdateInput {
  return {
    ...scalars(data),
    isPrimary: data.isPrimary,
    isActive: data.isActive,
  };
}

/** Unsets any other primary supplier for this property before the caller sets a new one. */
export async function clearOtherPrimaries(
  tx: Prisma.TransactionClient,
  propertyId: number,
  exceptPropertySupplierId?: bigint
) {
  await tx.propertySupplier.updateMany({
    where: {
      propertyId,
      isPrimary: true,
      ...(exceptPropertySupplierId != null ? { propertySupplierId: { not: exceptPropertySupplierId } } : {}),
    },
    data: { isPrimary: false },
  });
}
