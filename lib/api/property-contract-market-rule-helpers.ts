import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

export const propertyContractMarketRuleWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyContractId: z.number().int().positive("Contract is required"),
    marketTypeId: z.number().int().positive("Market type is required"),
    regionId: z.number().int().positive().nullable().optional(),
    countryId: z.number().int().positive().nullable().optional(),
    cityId: z.number().int().positive().nullable().optional(),
    marketGroupId: z.number().int().positive().nullable().optional(),
    ruleType: z.enum(["INCLUDE", "EXCLUDE"]),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => !v.fromDate || !v.toDate || v.fromDate <= v.toDate, {
    message: "From date must be on or before to date",
    path: ["toDate"],
  });

export type PropertyContractMarketRuleWriteData = z.infer<typeof propertyContractMarketRuleWriteSchema>;

export const propertyContractMarketRuleInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  marketType: { select: { marketTypeCode: true, marketTypeName: true } },
  region: { select: { regionCode: true, regionName: true } },
  country: { select: { countryCode: true, countryName: true } },
  city: { select: { cityCode: true, cityName: true } },
  marketGroup: { select: { marketGroupCode: true, marketGroupName: true } },
};

type MarketRuleRow = {
  propertyContractMarketRuleId: bigint;
  propertyContractId: bigint;
  marketTypeId: bigint;
  regionId: number | null;
  countryId: number | null;
  cityId: number | null;
  marketGroupId: bigint | null;
  fromDate: Date | null;
  toDate: Date | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  marketType?: { marketTypeCode: string; marketTypeName: string } | null;
  region?: { regionCode: string; regionName: string } | null;
  country?: { countryCode: string; countryName: string } | null;
  city?: { cityCode: string; cityName: string } | null;
  marketGroup?: { marketGroupCode: string; marketGroupName: string } | null;
  [key: string]: unknown;
};

function toDateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function serializePropertyContractMarketRuleRow(row: MarketRuleRow) {
  const {
    propertyContractMarketRuleId,
    propertyContractId,
    marketTypeId,
    regionId,
    countryId,
    cityId,
    marketGroupId,
    fromDate,
    toDate,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractMarketRuleId: Number(propertyContractMarketRuleId),
    propertyContractId: Number(propertyContractId),
    marketTypeId: Number(marketTypeId),
    regionId,
    countryId,
    cityId,
    marketGroupId: marketGroupId != null ? Number(marketGroupId) : null,
    fromDate: toDateOnly(fromDate),
    toDate: toDateOnly(toDate),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    marketTypeCode: row.marketType?.marketTypeCode,
    marketTypeName: row.marketType?.marketTypeName,
    regionCode: row.region?.regionCode,
    regionName: row.region?.regionName,
    countryCode: row.country?.countryCode,
    countryName: row.country?.countryName,
    cityCode: row.city?.cityCode,
    cityName: row.city?.cityName,
    marketGroupCode: row.marketGroup?.marketGroupCode,
    marketGroupName: row.marketGroup?.marketGroupName,
  };
}

export async function validatePropertyContractMarketRuleLookups(
  data: PropertyContractMarketRuleWriteData
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

  const marketType = await prisma.marketType.findUnique({
    where: { marketTypeId: BigInt(data.marketTypeId) },
  });
  if (
    !marketType ||
    marketType.tenantId !== data.tenantId ||
    marketType.companyId !== data.companyId ||
    !marketType.isActive
  ) {
    return NextResponse.json({ error: "Market type not found" }, { status: 400 });
  }

  const code = marketType.marketTypeCode.toUpperCase();
  const scopedField =
    code === "COUNTRY"
      ? "countryId"
      : code === "REGION"
        ? "regionId"
        : code === "CITY"
          ? "cityId"
          : code === "MARKET_GROUP"
            ? "marketGroupId"
            : null;

  if (scopedField && (data[scopedField] == null || (data[scopedField] as number) <= 0)) {
    return NextResponse.json(
      { error: `${marketType.marketTypeName} is required for market type ${marketType.marketTypeName}` },
      { status: 400 }
    );
  }

  if (data.regionId != null && data.regionId > 0) {
    const region = await prisma.region.findUnique({ where: { regionId: data.regionId } });
    if (!region) return NextResponse.json({ error: "Region not found" }, { status: 400 });
  }

  if (data.countryId != null && data.countryId > 0) {
    const country = await prisma.country.findUnique({ where: { countryId: data.countryId } });
    if (!country) return NextResponse.json({ error: "Country not found" }, { status: 400 });
  }

  if (data.cityId != null && data.cityId > 0) {
    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city) return NextResponse.json({ error: "City not found" }, { status: 400 });
  }

  if (data.marketGroupId != null && data.marketGroupId > 0) {
    const marketGroup = await prisma.marketGroup.findUnique({
      where: { marketGroupId: BigInt(data.marketGroupId) },
    });
    if (
      !marketGroup ||
      marketGroup.tenantId !== data.tenantId ||
      marketGroup.companyId !== data.companyId ||
      !marketGroup.isActive
    ) {
      return NextResponse.json({ error: "Market group not found" }, { status: 400 });
    }
  }

  return null;
}

function marketRuleScalars(data: PropertyContractMarketRuleWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    marketTypeId: BigInt(data.marketTypeId),
    regionId: data.regionId != null && data.regionId > 0 ? data.regionId : null,
    countryId: data.countryId != null && data.countryId > 0 ? data.countryId : null,
    cityId: data.cityId != null && data.cityId > 0 ? data.cityId : null,
    marketGroupId:
      data.marketGroupId != null && data.marketGroupId > 0 ? BigInt(data.marketGroupId) : null,
    ruleType: data.ruleType,
    fromDate: data.fromDate ? parseDateOnly(data.fromDate) : null,
    toDate: data.toDate ? parseDateOnly(data.toDate) : null,
  };
}

export async function createPropertyContractMarketRule(
  data: PropertyContractMarketRuleWriteData & { createdBy: number }
) {
  const created = await prisma.propertyContractMarketRule.create({
    data: {
      ...marketRuleScalars(data),
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
    },
  });
  return prisma.propertyContractMarketRule.findUniqueOrThrow({
    where: { propertyContractMarketRuleId: created.propertyContractMarketRuleId },
    include: propertyContractMarketRuleInclude,
  });
}

export async function updatePropertyContractMarketRule(
  marketRuleId: bigint,
  data: PropertyContractMarketRuleWriteData & { modifiedBy: number }
) {
  await prisma.propertyContractMarketRule.update({
    where: { propertyContractMarketRuleId: marketRuleId },
    data: {
      ...marketRuleScalars(data),
      isActive: data.isActive,
      modifiedBy: data.modifiedBy,
      modifiedDtTm: new Date(),
    },
  });
  return prisma.propertyContractMarketRule.findUniqueOrThrow({
    where: { propertyContractMarketRuleId: marketRuleId },
    include: propertyContractMarketRuleInclude,
  });
}
