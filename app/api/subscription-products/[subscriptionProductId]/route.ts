import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  subscriptionProductName: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});
const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ subscriptionProductId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { subscriptionProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    const row = await prisma.subscriptionProduct.findUnique({
      where: { subscriptionProductId: id.data },
    });
    if (!row) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { subscriptionProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.subscriptionProduct.update({
      where: { subscriptionProductId: id.data },
      data: {
        subscriptionProductName: parsed.data.subscriptionProductName.trim(),
        description: (parsed.data.description ?? "").trim(),
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This product name already exists" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { subscriptionProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.subscriptionProduct.update({
      where: { subscriptionProductId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { subscriptionProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    await prisma.subscriptionProduct.delete({ where: { subscriptionProductId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Product is in use by one or more subscription modules" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}
