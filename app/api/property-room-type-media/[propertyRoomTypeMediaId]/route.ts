import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  mediaTypeId: z.number().int().positive(),
  mediaCategoryId: z.number().int().positive(),
  mediaUrl: z.string().trim().min(1).max(1000),
  thumbnailUrl: z.string().trim().max(1000).nullable().optional(),
  fileName: z.string().trim().max(255).nullable().optional(),
  fileType: z.string().trim().max(50).nullable().optional(),
  altText: z.string().trim().max(500).nullable().optional(),
  caption: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyRoomTypeMediaId: string }> };

const mediaInclude = {
  mediaType: { select: { name: true } },
  mediaCategory: { select: { name: true } },
} as const;

function serialize<
  T extends { propertyRoomTypeMediaId: bigint; propertyRoomId: bigint; mediaTypeId: bigint; mediaCategoryId: bigint },
>(row: T) {
  return {
    ...row,
    propertyRoomTypeMediaId: Number(row.propertyRoomTypeMediaId),
    propertyRoomId: Number(row.propertyRoomId),
    mediaTypeId: Number(row.mediaTypeId),
    mediaCategoryId: Number(row.mediaCategoryId),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await prisma.propertyRoomTypeMedia.findUnique({
      where: { propertyRoomTypeMediaId: BigInt(id.data) },
    });
    if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.propertyRoomTypeMedia.updateMany({
          where: { propertyRoomId: existing.propertyRoomId, propertyRoomTypeMediaId: { not: BigInt(id.data) } },
          data: { isPrimary: false },
        });
      }
      return tx.propertyRoomTypeMedia.update({
        where: { propertyRoomTypeMediaId: BigInt(id.data) },
        data: {
          mediaTypeId: BigInt(data.mediaTypeId),
          mediaCategoryId: BigInt(data.mediaCategoryId),
          mediaUrl: data.mediaUrl,
          thumbnailUrl: data.thumbnailUrl?.trim() || null,
          fileName: data.fileName?.trim() || null,
          fileType: data.fileType?.trim() || null,
          altText: data.altText?.trim() || null,
          caption: data.caption?.trim() || null,
          displayOrder: data.displayOrder ?? 0,
          isPrimary: data.isPrimary ?? false,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include: mediaInclude,
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyRoomTypeMedia.update({
      where: { propertyRoomTypeMediaId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: mediaInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyRoomTypeMedia.delete({ where: { propertyRoomTypeMediaId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
