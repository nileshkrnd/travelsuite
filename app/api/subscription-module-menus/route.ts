import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import { ICONS } from "@/lib/icon-registry";
import {
  subscriptionModuleMenuInclude,
  syncMenuProductLinks,
} from "@/lib/subscription-module-menu-products";

const createSchema = z.object({
  subscriptionModuleId: z.number().int().positive(),
  parentMenuId: z.number().int().positive().nullable().optional(),
  menuName: z.string().trim().min(1).max(100),
  menuUrl: z.string().trim().min(1).max(200),
  menuIcon: z.string().trim().min(1).max(50).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  subscriptionProductIds: z.array(z.number().int().positive()).optional(),
  createdBy: z.number().int().positive(),
});

async function assertValidParent(
  subscriptionModuleId: number,
  parentMenuId: number | null | undefined
): Promise<string | null> {
  if (parentMenuId == null) return null;
  const parent = await prisma.subscriptionModuleMenu.findUnique({
    where: { subscriptionModuleMenuId: parentMenuId },
  });
  if (!parent) return "Parent menu not found";
  if (parent.subscriptionModuleId !== subscriptionModuleId) {
    return "Parent menu must belong to the same subscription module";
  }
  return null;
}

function resolveIcon(icon: string | undefined): string {
  const name = (icon ?? "Layers").trim();
  return name in ICONS ? name : "Layers";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const moduleIdParam = searchParams.get("moduleId");
    const where: Prisma.SubscriptionModuleMenuWhereInput = {};
    if (activeOnly) where.isActive = true;
    if (moduleIdParam != null && moduleIdParam !== "") {
      where.subscriptionModuleId = Number(moduleIdParam);
    }
    const rows = await prisma.subscriptionModuleMenu.findMany({
      where,
      include: subscriptionModuleMenuInclude,
      orderBy: [
        { subscriptionModuleId: "asc" },
        { sortOrder: "asc" },
        { menuName: "asc" },
      ],
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

    const module = await prisma.subscriptionModule.findUnique({
      where: { subscriptionModuleId: parsed.data.subscriptionModuleId },
      include: { product: { select: { subscriptionProductName: true } } },
    });
    if (!module) {
      return NextResponse.json({ error: "Subscription module not found" }, { status: 400 });
    }

    const parentMenuId = parsed.data.parentMenuId ?? null;
    const parentError = await assertValidParent(parsed.data.subscriptionModuleId, parentMenuId);
    if (parentError) {
      return NextResponse.json({ error: parentError }, { status: 400 });
    }

    const menuUrl = normalizeMenuUrl(parsed.data.menuUrl);
    if (!menuUrl) {
      return NextResponse.json({ error: "Menu URL is required" }, { status: 400 });
    }

    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const siblings = await prisma.subscriptionModuleMenu.count({
        where: {
          subscriptionModuleId: parsed.data.subscriptionModuleId,
          parentMenuId,
        },
      });
      sortOrder = siblings;
    }

    const created = await prisma.subscriptionModuleMenu.create({
      data: {
        subscriptionModuleId: parsed.data.subscriptionModuleId,
        parentMenuId,
        menuName: parsed.data.menuName.trim(),
        menuUrl,
        menuIcon: resolveIcon(parsed.data.menuIcon),
        sortOrder,
        isActive: parsed.data.isActive ?? true,
        createdBy: parsed.data.createdBy,
      },
    });

    await syncMenuProductLinks({
      subscriptionModuleMenuId: created.subscriptionModuleMenuId,
      subscriptionModuleId: parsed.data.subscriptionModuleId,
      subscriptionProductIds: parsed.data.subscriptionProductIds ?? [],
      createdBy: parsed.data.createdBy,
    });

    const row = await prisma.subscriptionModuleMenu.findUniqueOrThrow({
      where: { subscriptionModuleMenuId: created.subscriptionModuleMenuId },
      include: subscriptionModuleMenuInclude,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This menu URL already exists for the selected module" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
