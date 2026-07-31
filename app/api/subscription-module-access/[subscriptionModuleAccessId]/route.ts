import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  subscriptionModuleId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});
const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
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

type RouteContext = { params: Promise<{ subscriptionModuleAccessId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid access id" }, { status: 400 });
    const row = await prisma.subscriptionModuleAccess.findUnique({
      where: { subscriptionModuleAccessId: id.data },
      include,
    });
    if (!row) return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid access id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const [module, tenant] = await Promise.all([
      prisma.subscriptionModule.findUnique({
        where: { subscriptionModuleId: parsed.data.subscriptionModuleId },
      }),
      prisma.tenant.findUnique({ where: { tenantId: parsed.data.tenantId } }),
    ]);
    if (!module) return NextResponse.json({ error: "Subscription module not found" }, { status: 400 });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 400 });

    const updated = await prisma.subscriptionModuleAccess.update({
      where: { subscriptionModuleAccessId: id.data },
      data: {
        subscriptionModuleId: parsed.data.subscriptionModuleId,
        tenantId: parsed.data.tenantId,
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This module is already granted to the selected tenant" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid access id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.subscriptionModuleAccess.update({
      where: { subscriptionModuleAccessId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid access id" }, { status: 400 });
    await prisma.subscriptionModuleAccess.delete({
      where: { subscriptionModuleAccessId: id.data },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
