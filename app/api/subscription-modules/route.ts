import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  subscriptionProductId: z.number().int().positive(),
  subscriptionModuleName: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200).optional(),
  showInMenu: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const productInclude = {
  product: { select: { subscriptionProductName: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const productIdParam = searchParams.get("productId");
    const where: Prisma.SubscriptionModuleWhereInput = {};
    if (activeOnly) where.isActive = true;
    if (productIdParam != null && productIdParam !== "") {
      where.subscriptionProductId = Number(productIdParam);
    }
    const rows = await prisma.subscriptionModule.findMany({
      where,
      include: productInclude,
      orderBy: [{ sortOrder: "asc" }, { subscriptionModuleName: "asc" }],
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

    const product = await prisma.subscriptionProduct.findUnique({
      where: { subscriptionProductId: parsed.data.subscriptionProductId },
    });
    if (!product) {
      return NextResponse.json({ error: "Subscription product not found" }, { status: 400 });
    }

    const count = await prisma.subscriptionModule.count({
      where: { subscriptionProductId: parsed.data.subscriptionProductId },
    });

    const created = await prisma.subscriptionModule.create({
      data: {
        subscriptionProductId: parsed.data.subscriptionProductId,
        subscriptionModuleName: parsed.data.subscriptionModuleName.trim(),
        description: (parsed.data.description ?? "").trim(),
        sortOrder: count,
        showInMenu: parsed.data.showInMenu ?? true,
        isActive: parsed.data.isActive ?? true,
        createdBy: parsed.data.createdBy,
      },
      include: productInclude,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This module name already exists for the selected product" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
