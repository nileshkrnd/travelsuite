import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const employeePropertyGrantWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    isAllProperties: z.boolean(),
    propertyIds: z.array(z.number().int().positive()).optional().default([]),
    canView: z.boolean().optional(),
    canCreate: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    canSubmit: z.boolean().optional(),
    canApprove: z.boolean().optional(),
    isActive: z.boolean().optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .superRefine((values, ctx) => {
    if (!values.isAllProperties && values.propertyIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["propertyIds"], message: "Select at least one property" });
    }
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });

export const employeePropertyAccessInclude = {
  employee: { select: { title: true, firstName: true, lastName: true } },
  property: { select: { propertyCode: true, propertyName: true } },
} as const;

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function validateEmployeePropertyGrantLookups(data: {
  tenantId: number;
  companyId: number;
  employeeId: number;
  isAllProperties: boolean;
  propertyIds: number[];
}): Promise<NextResponse | null> {
  const employee = await prisma.employee.findFirst({
    where: { employeeId: data.employeeId, tenantId: data.tenantId, companyId: data.companyId },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found for this company" }, { status: 400 });

  if (!data.isAllProperties) {
    const uniqueIds = [...new Set(data.propertyIds)];
    const count = await prisma.property.count({ where: { propertyId: { in: uniqueIds } } });
    if (count !== uniqueIds.length) {
      return NextResponse.json({ error: "One or more properties were not found" }, { status: 400 });
    }
  }

  return null;
}

type WriteData = z.infer<typeof employeePropertyGrantWriteSchema>;

/** Full-replace save: deletes the employee's existing grant rows, then writes the new set in one transaction. */
export async function saveEmployeePropertyGrant(
  employeeId: number,
  data: WriteData & { createdBy: number }
) {
  const validFrom = parseDateOnly(data.validFrom) ?? null;
  const validTo = parseDateOnly(data.validTo) ?? null;
  const flags = {
    canView: data.canView ?? true,
    canCreate: data.canCreate ?? false,
    canEdit: data.canEdit ?? false,
    canSubmit: data.canSubmit ?? false,
    canApprove: data.canApprove ?? false,
    isActive: data.isActive ?? true,
  };

  return prisma.$transaction(async (tx) => {
    await tx.employeePropertyAccess.deleteMany({ where: { employeeId } });

    const rows = data.isAllProperties
      ? [{ propertyId: null }]
      : [...new Set(data.propertyIds)].map((propertyId) => ({ propertyId }));

    await tx.employeePropertyAccess.createMany({
      data: rows.map((r) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        employeeId,
        propertyId: r.propertyId,
        ...flags,
        validFrom,
        validTo,
        createdBy: data.createdBy,
      })),
    });

    return tx.employeePropertyAccess.findMany({
      where: { employeeId },
      include: employeePropertyAccessInclude,
      orderBy: [{ propertyId: "asc" }],
    });
  });
}

export function serializeRows<T extends { employeePropertyAccessId: bigint; [key: string]: unknown }>(rows: T[]) {
  return rows.map((r) => ({ ...r, employeePropertyAccessId: Number(r.employeePropertyAccessId) }));
}
