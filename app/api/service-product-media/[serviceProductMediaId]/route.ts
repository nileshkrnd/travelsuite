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
  mediaTitle: z.string().trim().max(250).nullable().optional(),
  mediaDescription: z.string().trim().max(1000).nullable().optional(),
  altText: z.string().trim().max(500).nullable().optional(),
  fileName: z.string().trim().max(250).nullable().optional(),
  fileExtension: z.string().trim().max(20).nullable().optional(),
  mimeType: z.string().trim().max(100).nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  width: z.number().int().nonnegative().nullable().optional(),
  height: z.number().int().nonnegative().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductMediaId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  mediaType: { select: { name: true } },
  mediaCategory: { select: { name: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function toRow<
  T extends {
    serviceProductMediaId: bigint;
    serviceProductId: bigint;
    mediaTypeId: bigint;
    mediaCategoryId: bigint;
    fileSize: bigint | null;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductMediaId: Number(row.serviceProductMediaId),
    serviceProductId: Number(row.serviceProductId),
    mediaTypeId: Number(row.mediaTypeId),
    mediaCategoryId: Number(row.mediaCategoryId),
    fileSize: row.fileSize != null ? Number(row.fileSize) : null,
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductMedia.findUnique({
      where: { serviceProductMediaId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductMedia.update({
      where: { serviceProductMediaId: BigInt(id.data) },
      data: {
        mediaTypeId: BigInt(data.mediaTypeId),
        mediaCategoryId: BigInt(data.mediaCategoryId),
        mediaUrl: data.mediaUrl.trim(),
        thumbnailUrl: data.thumbnailUrl?.trim() || null,
        mediaTitle: data.mediaTitle?.trim() || null,
        mediaDescription: data.mediaDescription?.trim() || null,
        altText: data.altText?.trim() || null,
        fileName: data.fileName?.trim() || null,
        fileExtension: data.fileExtension?.trim() || null,
        mimeType: data.mimeType?.trim() || null,
        fileSize: data.fileSize != null ? BigInt(data.fileSize) : null,
        width: data.width ?? null,
        height: data.height ?? null,
        durationSeconds: data.durationSeconds ?? null,
        isPrimary: data.isPrimary ?? false,
        displayOrder: data.displayOrder ?? 0,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductMedia.update({
      where: { serviceProductMediaId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductMediaId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductMedia.delete({ where: { serviceProductMediaId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
