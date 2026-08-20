import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductMediaWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductMedia.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }],
    });
    return NextResponse.json(rows.map(toRow));
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

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.serviceProductMedia.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
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
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
