import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude, validateCancellationPolicyLookups } from "../route";

const idSchema = z.coerce.number().int().positive();

const ruleSchema = z.object({
  fromDaysBefore: z.number().int().min(0),
  toDaysBefore: z.number().int().min(0).nullable().optional(),
  cancellationPolicyTypeId: z.number().int().positive(),
  penaltyValue: z.number().min(0),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  policyCode: z.string().trim().min(1).max(50),
  policyName: z.string().trim().min(1).max(150),
  serviceProductSupplierId: z.number().int().positive().nullable().optional(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  rules: z.array(ruleSchema).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductCancellationPolicyId: string }> };

function toRow<
  T extends {
    serviceProductCancellationPolicyId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    rules?: { serviceProductCancellationPolicyRuleId: bigint; serviceProductCancellationPolicyId: bigint; cancellationPolicyTypeId: bigint }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductCancellationPolicyId: Number(row.serviceProductCancellationPolicyId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    rules: row.rules?.map((r) => ({
      ...r,
      serviceProductCancellationPolicyRuleId: Number(r.serviceProductCancellationPolicyRuleId),
      serviceProductCancellationPolicyId: Number(r.serviceProductCancellationPolicyId),
      cancellationPolicyTypeId: Number(r.cancellationPolicyTypeId),
    })),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductCancellationPolicy.findUnique({
      where: { serviceProductCancellationPolicyId: BigInt(id.data) },
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
    const { serviceProductCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const policyId = BigInt(id.data);

    const { error } = await validateCancellationPolicyLookups(data);
    if (error) return error;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductCancellationPolicy.update({
        where: { serviceProductCancellationPolicyId: policyId },
        data: {
          policyCode: data.policyCode.trim(),
          policyName: data.policyName.trim(),
          serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
          serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
          serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
          isDefault: data.isDefault ?? false,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      await tx.serviceProductCancellationPolicyRule.deleteMany({ where: { serviceProductCancellationPolicyId: policyId } });
      if (data.rules?.length) {
        await tx.serviceProductCancellationPolicyRule.createMany({
          data: data.rules.map((r) => ({
            serviceProductCancellationPolicyId: policyId,
            fromDaysBefore: r.fromDaysBefore,
            toDaysBefore: r.toDaysBefore ?? null,
            cancellationPolicyTypeId: BigInt(r.cancellationPolicyTypeId),
            penaltyValue: r.penaltyValue,
            isActive: r.isActive ?? true,
            createdBy: data.modifiedBy,
          })),
        });
      }

      return tx.serviceProductCancellationPolicy.findUniqueOrThrow({
        where: { serviceProductCancellationPolicyId: policyId },
        include: rowInclude,
      });
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Policy code already exists on this product" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductCancellationPolicy.update({
      where: { serviceProductCancellationPolicyId: BigInt(id.data) },
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
    const { serviceProductCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductCancellationPolicy.delete({ where: { serviceProductCancellationPolicyId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
