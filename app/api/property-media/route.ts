import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const IMAGE_TYPE_OPTIONS = ["Rooms", "Bathroom", "Amenities", "Pool", "Common Areas", "Dining", "Others"];

/** PropertyMediaID is a BigInt column — convert to number before NextResponse.json(). */
function serialize<T extends { propertyMediaId: bigint }>(row: T) {
  return { ...row, propertyMediaId: Number(row.propertyMediaId) };
}

/** Property media list — filter by PropertyID. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    if (!propertyIdParam) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }
    const propertyId = Number(propertyIdParam);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    }
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.propertyMedia.findMany({
      where: {
        propertyId,
        isDeleted: false,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ isCover: "desc" }, { displayOrder: "asc" }, { createdDtTm: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

const metaSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  mediaType: z.enum(["image", "video"]),
  imageType: z.string().trim().min(1).max(50),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  createdBy: z.coerce.number().int().positive(),
});

/** Uploads one media file for a property, storing it under public/uploads/properties/<propertyId>/. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const parsed = metaSchema.safeParse({
      propertyId: formData.get("propertyId"),
      mediaType: formData.get("mediaType"),
      imageType: formData.get("imageType"),
      description: formData.get("description") ?? "",
      createdBy: formData.get("createdBy"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (!IMAGE_TYPE_OPTIONS.includes(data.imageType)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

    const extMap = data.mediaType === "video" ? VIDEO_EXT : IMAGE_EXT;
    const ext = extMap[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          error:
            data.mediaType === "video"
              ? "Unsupported video type. Use MP4, WEBM, or MOV."
              : "Unsupported image type. Use PNG, JPG, or WEBP.",
        },
        { status: 400 }
      );
    }
    const maxBytes = data.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        { error: `File must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB` },
        { status: 400 }
      );
    }

    const name = `${Date.now()}_${randomBytes(4).toString("hex")}${ext}`;
    const relative = `/uploads/properties/${data.propertyId}/${name}`;
    const dir = path.join(process.cwd(), "public", "uploads", "properties", String(data.propertyId));
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);

    const hasCover = await prisma.propertyMedia.findFirst({
      where: { propertyId: data.propertyId, isCover: true, isDeleted: false },
      select: { propertyMediaId: true },
    });

    const created = await prisma.propertyMedia.create({
      data: {
        propertyId: data.propertyId,
        mediaType: data.mediaType,
        imageType: data.imageType,
        mediaUrl: relative,
        fileName: file.name,
        description: data.description?.trim() || null,
        isCover: !hasCover,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
