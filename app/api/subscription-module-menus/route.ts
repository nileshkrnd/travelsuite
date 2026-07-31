import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";

const createSchema = z.object({
  subscriptionModuleId: z.number().int().positive(),
  menuName: z.string().trim().min(1).max(100),
  menuUrl: z.string().trim().min(1).max(200),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const include = {
  module: {
    select: {
      subscriptionModuleName: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
} as const;

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
      include,
      orderBy: [{ subscriptionModuleId: "asc" }, { menuName: "asc" }],
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
    });
    if (!module) {
      return NextResponse.json({ error: "Subscription module not found" }, { status: 400 });
    }

    const menuUrl = normalizeMenuUrl(parsed.data.menuUrl);
    if (!menuUrl) {
      return NextResponse.json({ error: "Menu URL is required" }, { status: 400 });
    }

    const created = await prisma.subscriptionModuleMenu.create({
      data: {
        subscriptionModuleId: parsed.data.subscriptionModuleId,
        menuName: parsed.data.menuName.trim(),
        menuUrl,
        isActive: parsed.data.isActive ?? true,
        createdBy: parsed.data.createdBy,
      },
      include,
    });
    return NextResponse.json(created, { status: 201 });
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
