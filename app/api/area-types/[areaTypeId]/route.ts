import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  areaTypeCode: z.string().trim().min(1).max(50),
  areaTypeName: z.string().trim().min(1).max(150),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

type RouteContext = { params: Promise<{ areaTypeId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { areaTypeId } = await context.params;
    const id = idSchema.safeParse(areaTypeId);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.areaType.update({
      where: { areaTypeId: id.data },
      data: {
        areaTypeCode: data.areaTypeCode,
        areaTypeName: data.areaTypeName,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Area type not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "An area type with this code or name already exists" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { areaTypeId } = await context.params;
    const id = idSchema.safeParse(areaTypeId);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.areaType.update({
      where: { areaTypeId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Area type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { areaTypeId } = await context.params;
    const id = idSchema.safeParse(areaTypeId);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.areaType.update({
      where: { areaTypeId: id.data },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Area type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
