import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const employeePropertyAccessWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    employeeId: z.number().int().positive("Employee is required"),
    propertyId: z.number().int().positive("Property is required"),
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

export async function validateEmployeePropertyAccessLookups(data: {
  tenantId: number;
  companyId: number;
  employeeId: number;
  propertyId: number;
}): Promise<NextResponse | null> {
  const employee = await prisma.employee.findFirst({
    where: { employeeId: data.employeeId, tenantId: data.tenantId, companyId: data.companyId },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found for this company" }, { status: 400 });

  const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

  return null;
}

type WriteData = z.infer<typeof employeePropertyAccessWriteSchema>;

function scalars(data: WriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    employeeId: data.employeeId,
    propertyId: data.propertyId,
    canView: data.canView ?? true,
    canCreate: data.canCreate ?? false,
    canEdit: data.canEdit ?? false,
    canSubmit: data.canSubmit ?? false,
    canApprove: data.canApprove ?? false,
    validFrom: parseDateOnly(data.validFrom) ?? null,
    validTo: parseDateOnly(data.validTo) ?? null,
  };
}

export function toEmployeePropertyAccessCreateData(
  data: WriteData & { createdBy: number }
): Prisma.EmployeePropertyAccessUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toEmployeePropertyAccessUpdateScalars(
  data: WriteData
): Prisma.EmployeePropertyAccessUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive };
}
