import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  subscriptionProductId: z.number().int().positive(),
  subscriptionModuleName: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200).optional(),
  showInMenu: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});
const patchSchema = z.object({
  isActive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
}).refine((d) => d.isActive !== undefined || d.showInMenu !== undefined, {
  message: "isActive or showInMenu is required",
});

const productInclude = {
  product: { select: { subscriptionProductName: true } },
} as const;

type RouteContext = { params: Promise<{ subscriptionModuleId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid module id" }, { status: 400 });
    const row = await prisma.subscriptionModule.findUnique({
      where: { subscriptionModuleId: id.data },
      include: productInclude,
    });
    if (!row) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid module id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const product = await prisma.subscriptionProduct.findUnique({
      where: { subscriptionProductId: parsed.data.subscriptionProductId },
    });
    if (!product) {
      return NextResponse.json({ error: "Subscription product not found" }, { status: 400 });
    }

    const updated = await prisma.subscriptionModule.update({
      where: { subscriptionModuleId: id.data },
      data: {
        subscriptionProductId: parsed.data.subscriptionProductId,
        subscriptionModuleName: parsed.data.subscriptionModuleName.trim(),
        description: (parsed.data.description ?? "").trim(),
        ...(parsed.data.showInMenu !== undefined ? { showInMenu: parsed.data.showInMenu } : {}),
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: productInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Module not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This module name already exists for the selected product" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid module id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.subscriptionModule.update({
      where: { subscriptionModuleId: id.data },
      data: {
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.showInMenu !== undefined ? { showInMenu: parsed.data.showInMenu } : {}),
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: productInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid module id" }, { status: 400 });
    await prisma.subscriptionModule.delete({ where: { subscriptionModuleId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
