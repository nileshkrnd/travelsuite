import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  subscriptionModuleId: z.number().int().positive(),
  menuName: z.string().trim().min(1).max(100),
  menuUrl: z.string().trim().min(1).max(200),
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
} as const;

type RouteContext = { params: Promise<{ subscriptionModuleMenuId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleMenuId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });
    const row = await prisma.subscriptionModuleMenu.findUnique({
      where: { subscriptionModuleMenuId: id.data },
      include,
    });
    if (!row) return NextResponse.json({ error: "Module menu not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleMenuId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const module = await prisma.subscriptionModule.findUnique({
      where: { subscriptionModuleId: parsed.data.subscriptionModuleId },
    });
    if (!module) {
      return NextResponse.json({ error: "Subscription module not found" }, { status: 400 });
    }

    const menuUrl = normalizeMenuUrl(parsed.data.menuUrl);
    if (!menuUrl) {
      return NextResponse.json({ error: "Menu URL is required" }, { status: 400 });
    }

    const updated = await prisma.subscriptionModuleMenu.update({
      where: { subscriptionModuleMenuId: id.data },
      data: {
        subscriptionModuleId: parsed.data.subscriptionModuleId,
        menuName: parsed.data.menuName.trim(),
        menuUrl,
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
        return NextResponse.json({ error: "Module menu not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This menu URL already exists for the selected module" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleMenuId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.subscriptionModuleMenu.update({
      where: { subscriptionModuleMenuId: id.data },
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
      return NextResponse.json({ error: "Module menu not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { subscriptionModuleMenuId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });
    await prisma.subscriptionModuleMenu.delete({
      where: { subscriptionModuleMenuId: id.data },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Module menu not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
