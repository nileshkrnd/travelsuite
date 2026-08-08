import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const supplierPropertyAccessWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertySupplierId: z.number().int().positive("Property/Supplier link is required"),
    userId: z.number().int().positive("User is required"),
    canView: z.boolean().optional(),
    canCreateRate: z.boolean().optional(),
    canEditRate: z.boolean().optional(),
    canSubmitRate: z.boolean().optional(),
    canApproveRate: z.boolean().optional(),
    isActive: z.boolean().optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });

export const supplierPropertyAccessInclude = {
  propertySupplier: {
    select: {
      property: { select: { propertyName: true, propertyCode: true } },
      supplier: { select: { supplierName: true } },
    },
  },
  user: { select: { userDisplayName: true } },
} as const;

type SerializableRow = { supplierPropertyAccessId: bigint; propertySupplierId: bigint; [key: string]: unknown };

export function serializeSupplierPropertyAccessRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    supplierPropertyAccessId: Number(row.supplierPropertyAccessId),
    propertySupplierId: Number(row.propertySupplierId),
  };
}

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function validateSupplierPropertyAccessLookups(data: {
  propertySupplierId: number;
  userId: number;
}): Promise<NextResponse | null> {
  const link = await prisma.propertySupplier.findUnique({ where: { propertySupplierId: BigInt(data.propertySupplierId) } });
  if (!link) return NextResponse.json({ error: "Property/Supplier link not found" }, { status: 400 });

  const supplierUser = await prisma.supplierUser.findUnique({ where: { userId: data.userId } });
  if (!supplierUser || supplierUser.supplierId !== link.supplierId) {
    return NextResponse.json({ error: "User is not a portal user for this link's supplier" }, { status: 400 });
  }

  return null;
}

type WriteData = z.infer<typeof supplierPropertyAccessWriteSchema>;

function scalars(data: WriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertySupplierId: BigInt(data.propertySupplierId),
    userId: data.userId,
    canView: data.canView ?? true,
    canCreateRate: data.canCreateRate ?? false,
    canEditRate: data.canEditRate ?? false,
    canSubmitRate: data.canSubmitRate ?? false,
    canApproveRate: data.canApproveRate ?? false,
    validFrom: parseDateOnly(data.validFrom) ?? null,
    validTo: parseDateOnly(data.validTo) ?? null,
  };
}

export function toSupplierPropertyAccessCreateData(
  data: WriteData & { createdBy: number }
): Prisma.SupplierPropertyAccessUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toSupplierPropertyAccessUpdateScalars(
  data: WriteData
): Prisma.SupplierPropertyAccessUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive };
}
