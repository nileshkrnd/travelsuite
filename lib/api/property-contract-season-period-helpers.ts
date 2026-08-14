import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const propertyContractSeasonPeriodWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyContractId: z.number().int().positive("Contract is required"),
    propertySeasonId: z.number().int().positive("Season is required"),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "From date is required"),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "To date is required"),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.toDate < values.fromDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "To date must be on or after from date" });
    }
  });

export type PropertyContractSeasonPeriodWriteData = z.infer<typeof propertyContractSeasonPeriodWriteSchema>;

export const propertyContractSeasonPeriodInclude = {
  propertyContract: {
    select: {
      contractNumber: true,
      contractName: true,
      propertyId: true,
      property: { select: { propertyName: true, propertyCode: true } },
    },
  },
  propertySeason: { select: { seasonCode: true, seasonName: true } },
} as const;

type SerializableRow = {
  propertyContractSeasonPeriodId: bigint;
  propertyContractId: bigint;
  propertySeasonId: bigint;
  [key: string]: unknown;
};

export function serializePropertyContractSeasonPeriodRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    propertyContractSeasonPeriodId: Number(row.propertyContractSeasonPeriodId),
    propertyContractId: Number(row.propertyContractId),
    propertySeasonId: Number(row.propertySeasonId),
  };
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function validatePropertyContractSeasonPeriodLookups(
  data: PropertyContractSeasonPeriodWriteData
): Promise<NextResponse | null> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(data.propertyContractId) },
  });
  if (!contract || contract.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Contract not found for this tenant" }, { status: 400 });
  }

  const season = await prisma.propertySeason.findUnique({
    where: { propertySeasonId: BigInt(data.propertySeasonId) },
  });
  if (!season || season.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Season not found for this tenant" }, { status: 400 });
  }

  if (season.propertyId !== contract.propertyId) {
    return NextResponse.json(
      { error: "Season must belong to the same property as the contract" },
      { status: 400 }
    );
  }

  return null;
}

function scalars(data: PropertyContractSeasonPeriodWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    propertySeasonId: BigInt(data.propertySeasonId),
    fromDate: parseDateOnly(data.fromDate),
    toDate: parseDateOnly(data.toDate),
  };
}

export function toPropertyContractSeasonPeriodCreateData(
  data: PropertyContractSeasonPeriodWriteData & { createdBy: number }
): Prisma.PropertyContractSeasonPeriodUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyContractSeasonPeriodUpdateScalars(
  data: PropertyContractSeasonPeriodWriteData & { modifiedBy: number }
): Prisma.PropertyContractSeasonPeriodUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
