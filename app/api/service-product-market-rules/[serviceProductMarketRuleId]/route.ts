import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude, validateMarketRuleLookups } from "../route";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductSupplierId: z.number().int().positive().nullable().optional(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  marketTypeId: z.number().int().positive(),
  regionId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  marketGroupId: z.number().int().positive().nullable().optional(),
  ruleTypeId: z.number().int().positive(),
  fromDate: z.string().trim().min(1).nullable().optional(),
  toDate: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductMarketRuleId: string }> };

function toRow<
  T extends {
    serviceProductMarketRuleId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    marketTypeId: bigint;
    marketGroupId: bigint | null;
    ruleTypeId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductMarketRuleId: Number(row.serviceProductMarketRuleId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    marketTypeId: Number(row.marketTypeId),
    marketGroupId: row.marketGroupId != null ? Number(row.marketGroupId) : null,
    ruleTypeId: Number(row.ruleTypeId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductMarketRuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductMarketRule.findUnique({
      where: { serviceProductMarketRuleId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductMarketRuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const { error } = await validateMarketRuleLookups(data);
    if (error) return error;

    const updated = await prisma.serviceProductMarketRule.update({
      where: { serviceProductMarketRuleId: BigInt(id.data) },
      data: {
        serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        marketTypeId: BigInt(data.marketTypeId),
        regionId: data.regionId ?? null,
        countryId: data.countryId ?? null,
        cityId: data.cityId ?? null,
        marketGroupId: data.marketGroupId != null ? BigInt(data.marketGroupId) : null,
        ruleTypeId: BigInt(data.ruleTypeId),
        fromDate: data.fromDate ? new Date(data.fromDate) : null,
        toDate: data.toDate ? new Date(data.toDate) : null,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductMarketRuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductMarketRule.update({
      where: { serviceProductMarketRuleId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductMarketRuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductMarketRule.delete({ where: { serviceProductMarketRuleId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
