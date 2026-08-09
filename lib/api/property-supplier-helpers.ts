import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

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

export const supplierPropertyGrantWriteSchema = z
  .object({
    propertyIds: z.array(z.number().int().positive()).min(1, "Select at least one property"),
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

type GrantWriteData = z.infer<typeof supplierPropertyGrantWriteSchema>;

export async function validateSupplierPropertiesLookup(
  supplierId: number,
  propertyIds: number[]
): Promise<NextResponse | { supplier: { tenantId: number } }> {
  const supplier = await prisma.supplier.findFirst({
    where: { supplierId: BigInt(supplierId), isDeleted: false },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

  const uniqueIds = [...new Set(propertyIds)];
  const properties = await prisma.property.findMany({ where: { propertyId: { in: uniqueIds } } });
  if (properties.length !== uniqueIds.length) {
    return NextResponse.json({ error: "One or more properties were not found" }, { status: 400 });
  }
  const mismatched = properties.find((p) => p.tenantId != null && p.tenantId !== supplier.tenantId);
  if (mismatched) {
    return NextResponse.json(
      { error: "One or more properties belong to a different tenant than the supplier" },
      { status: 400 }
    );
  }

  return { supplier };
}

/** Full-replace save: deletes the supplier's existing property links, then writes the new set in one transaction. */
export async function saveSupplierPropertyGrant(
  supplierId: number,
  data: GrantWriteData & { createdBy: number }
) {
  const validFrom = parseDateOnly(data.validFrom) ?? null;
  const validTo = parseDateOnly(data.validTo) ?? null;
  const isPrimary = data.isPrimary ?? false;
  const isActive = data.isActive ?? true;
  const uniquePropertyIds = [...new Set(data.propertyIds)];

  return prisma.$transaction(async (tx) => {
    await tx.propertySupplier.deleteMany({ where: { supplierId: BigInt(supplierId) } });

    // Create every link as non-primary first, so clearing other suppliers' primary flag below can't clobber our own.
    await tx.propertySupplier.createMany({
      data: uniquePropertyIds.map((propertyId) => ({
        propertyId,
        supplierId: BigInt(supplierId),
        isPrimary: false,
        isActive,
        validFrom,
        validTo,
        createdBy: data.createdBy,
      })),
    });

    if (isPrimary) {
      for (const propertyId of uniquePropertyIds) {
        await clearOtherPrimaries(tx, propertyId);
      }
      await tx.propertySupplier.updateMany({
        where: { supplierId: BigInt(supplierId), propertyId: { in: uniquePropertyIds } },
        data: { isPrimary: true },
      });
    }

    return tx.propertySupplier.findMany({
      where: { supplierId: BigInt(supplierId) },
      include: propertySupplierInclude,
      orderBy: [{ propertyId: "asc" }],
    });
  });
}
