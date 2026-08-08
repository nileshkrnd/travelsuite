import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/** Parses a route param into a positive BigInt id, or null if invalid. */
function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

function serialize<T extends { propertyMediaId: bigint }>(row: T) {
  return { ...row, propertyMediaId: Number(row.propertyMediaId) };
}

const IMAGE_TYPE_OPTIONS = ["Rooms", "Bathroom", "Amenities", "Pool", "Common Areas", "Dining", "Others"];

const patchSchema = z.object({
  imageType: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isCover: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ propertyMediaId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyMediaId } = await context.params;
    const id = parseId(propertyMediaId);
    if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.imageType != null && !IMAGE_TYPE_OPTIONS.includes(data.imageType)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    const existing = await prisma.propertyMedia.findUnique({ where: { propertyMediaId: id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isCover === true && !existing.isCover) {
        await tx.propertyMedia.updateMany({
          where: { propertyId: existing.propertyId, isCover: true },
          data: { isCover: false },
        });
      }
      return tx.propertyMedia.update({
        where: { propertyMediaId: id },
        data: {
          ...(data.imageType != null ? { imageType: data.imageType } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.isCover !== undefined ? { isCover: data.isCover } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
    });

    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true; if it was the cover, promotes another remaining item to cover. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { propertyMediaId } = await context.params;
    const id = parseId(propertyMediaId);
    if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    const existing = await prisma.propertyMedia.findUnique({ where: { propertyMediaId: id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.propertyMedia.update({
        where: { propertyMediaId: id },
        data: {
          isDeleted: true,
          isCover: false,
          modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
          modifiedDtTm: new Date(),
        },
      });

      if (existing.isCover) {
        const next = await tx.propertyMedia.findFirst({
          where: { propertyId: existing.propertyId, isDeleted: false, propertyMediaId: { not: id } },
          orderBy: [{ displayOrder: "asc" }, { createdDtTm: "asc" }],
        });
        if (next) {
          await tx.propertyMedia.update({
            where: { propertyMediaId: next.propertyMediaId },
            data: { isCover: true },
          });
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
