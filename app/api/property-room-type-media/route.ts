import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyId: z.number().int().positive(),
  propertyRoomId: z.number().int().positive(),
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
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyRoomIdParam = searchParams.get("propertyRoomId");
    const tenantIdParam = searchParams.get("tenantId");

    const where: Prisma.PropertyRoomTypeMediaWhereInput = {};
    if (propertyRoomIdParam) where.propertyRoomId = BigInt(propertyRoomIdParam);
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);

    const rows = await prisma.propertyRoomTypeMedia.findMany({
      where,
      include: mediaInclude,
      orderBy: [{ displayOrder: "asc" }, { createdDtTm: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const room = await prisma.propertyRoom.findUnique({ where: { propertyRoomId: BigInt(data.propertyRoomId) } });
    if (!room) return NextResponse.json({ error: "Property room not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.propertyRoomTypeMedia.updateMany({
          where: { propertyRoomId: BigInt(data.propertyRoomId) },
          data: { isPrimary: false },
        });
      }
      return tx.propertyRoomTypeMedia.create({
        data: {
          propertyId: data.propertyId,
          propertyRoomId: BigInt(data.propertyRoomId),
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
          tenantId: data.tenantId,
          companyId: data.companyId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include: mediaInclude,
      });
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
