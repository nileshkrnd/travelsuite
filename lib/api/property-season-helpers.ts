import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const propertySeasonWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyId: z.number().int().positive("Property is required"),
  seasonCode: z
    .string()
    .trim()
    .min(1, "Season code is required")
    .max(50)
    .transform((v) => v.toUpperCase()),
  seasonName: z.string().trim().min(1, "Season name is required").max(100),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type PropertySeasonWriteData = z.infer<typeof propertySeasonWriteSchema>;

export const propertySeasonInclude = {
  property: { select: { propertyName: true, propertyCode: true } },
} as const;

type SerializableRow = {
  propertySeasonId: bigint;
  [key: string]: unknown;
};

export function serializePropertySeasonRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    propertySeasonId: Number(row.propertySeasonId),
  };
}

export async function validatePropertySeasonLookups(
  data: PropertySeasonWriteData
): Promise<NextResponse | null> {
  const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });
  return null;
}

function scalars(data: PropertySeasonWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyId: data.propertyId,
    seasonCode: data.seasonCode,
    seasonName: data.seasonName,
    displayOrder: data.displayOrder ?? 0,
  };
}

export function toPropertySeasonCreateData(
  data: PropertySeasonWriteData & { createdBy: number }
): Prisma.PropertySeasonUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertySeasonUpdateScalars(
  data: PropertySeasonWriteData & { modifiedBy: number }
): Prisma.PropertySeasonUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
