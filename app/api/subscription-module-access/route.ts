import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z
  .object({
    subscriptionModuleId: z.number().int().positive().optional(),
    subscriptionModuleIds: z.array(z.number().int().positive()).min(1).optional(),
    tenantId: z.number().int().positive(),
    isActive: z.boolean().optional(),
    createdBy: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    const ids = data.subscriptionModuleIds?.length
      ? data.subscriptionModuleIds
      : data.subscriptionModuleId
        ? [data.subscriptionModuleId]
        : [];
    if (ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one subscription module",
        path: ["subscriptionModuleIds"],
      });
    }
  });

const include = {
  module: {
    select: {
      subscriptionModuleName: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
  tenant: { select: { tenantName: true, tenantCode: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const tenantIdParam = searchParams.get("tenantId");
    const moduleIdParam = searchParams.get("moduleId");
    const where: Prisma.SubscriptionModuleAccessWhereInput = {};
    if (activeOnly) where.isActive = true;
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (moduleIdParam != null && moduleIdParam !== "") {
      where.subscriptionModuleId = Number(moduleIdParam);
    }
    const rows = await prisma.subscriptionModuleAccess.findMany({
      where,
      include,
      orderBy: [{ tenantId: "asc" }, { subscriptionModuleId: "asc" }],
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const moduleIds = [
      ...new Set(
        parsed.data.subscriptionModuleIds?.length
          ? parsed.data.subscriptionModuleIds
          : parsed.data.subscriptionModuleId
            ? [parsed.data.subscriptionModuleId]
            : []
      ),
    ];

    const [foundModules, tenant] = await Promise.all([
      prisma.subscriptionModule.findMany({
        where: { subscriptionModuleId: { in: moduleIds } },
        select: { subscriptionModuleId: true },
      }),
      prisma.tenant.findUnique({ where: { tenantId: parsed.data.tenantId } }),
    ]);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    if (foundModules.length !== moduleIds.length) {
      return NextResponse.json({ error: "One or more subscription modules were not found" }, { status: 400 });
    }

    const existing = await prisma.subscriptionModuleAccess.findMany({
      where: {
        tenantId: parsed.data.tenantId,
        subscriptionModuleId: { in: moduleIds },
      },
      select: { subscriptionModuleId: true },
    });
    const existingSet = new Set(existing.map((r) => r.subscriptionModuleId));
    const toCreate = moduleIds.filter((id) => !existingSet.has(id));
    if (toCreate.length === 0) {
      return NextResponse.json(
        { error: "Selected modules are already granted to this tenant" },
        { status: 409 }
      );
    }

    await prisma.subscriptionModuleAccess.createMany({
      data: toCreate.map((subscriptionModuleId) => ({
        subscriptionModuleId,
        tenantId: parsed.data.tenantId,
        isActive: parsed.data.isActive ?? true,
        createdBy: parsed.data.createdBy,
      })),
    });

    const created = await prisma.subscriptionModuleAccess.findMany({
      where: {
        tenantId: parsed.data.tenantId,
        subscriptionModuleId: { in: toCreate },
      },
      include,
      orderBy: { subscriptionModuleId: "asc" },
    });

    return NextResponse.json(moduleIds.length === 1 ? created[0] : created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This module is already granted to the selected tenant" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
