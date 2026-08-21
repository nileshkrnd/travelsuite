import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude } from "../route";

const idSchema = z.coerce.number().int().positive();

const pointSchema = z.object({
  pointText: z.string().trim().min(1).max(2000),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const itemSchema = z.object({
  itemTitle: z.string().trim().min(1).max(250),
  itemDescription: z.string().trim().max(10000).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  points: z.array(pointSchema).optional(),
});

const updateSchema = z.object({
  contentSectionTypeId: z.number().int().positive(),
  sectionTitle: z.string().trim().min(1).max(250),
  sectionDescription: z.string().trim().max(10000).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  items: z.array(itemSchema).optional(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductContentSectionId: string }> };

function toRow<
  T extends {
    serviceProductContentSectionId: bigint;
    serviceProductId: bigint;
    contentSectionTypeId: bigint;
    items?: {
      serviceProductContentSectionItemId: bigint;
      serviceProductContentSectionId: bigint;
      points?: { serviceProductContentSectionItemPointId: bigint; serviceProductContentSectionItemId: bigint }[];
    }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductContentSectionId: Number(row.serviceProductContentSectionId),
    serviceProductId: Number(row.serviceProductId),
    contentSectionTypeId: Number(row.contentSectionTypeId),
    items: row.items?.map((item) => ({
      ...item,
      serviceProductContentSectionItemId: Number(item.serviceProductContentSectionItemId),
      serviceProductContentSectionId: Number(item.serviceProductContentSectionId),
      points: item.points?.map((p) => ({
        ...p,
        serviceProductContentSectionItemPointId: Number(p.serviceProductContentSectionItemPointId),
        serviceProductContentSectionItemId: Number(p.serviceProductContentSectionItemId),
      })),
    })),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductContentSectionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const sectionId = BigInt(id.data);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceProductContentSection.update({
        where: { serviceProductContentSectionId: sectionId },
        data: {
          contentSectionTypeId: BigInt(data.contentSectionTypeId),
          sectionTitle: data.sectionTitle.trim(),
          sectionDescription: data.sectionDescription?.trim() || null,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });

      // Cascades to delete each item's points too (DB-level onDelete: Cascade).
      await tx.serviceProductContentSectionItem.deleteMany({ where: { serviceProductContentSectionId: sectionId } });

      for (const item of data.items ?? []) {
        await tx.serviceProductContentSectionItem.create({
          data: {
            serviceProductContentSectionId: sectionId,
            itemTitle: item.itemTitle.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            displayOrder: item.displayOrder ?? 0,
            isActive: item.isActive ?? true,
            createdBy: data.modifiedBy,
            points: {
              create: (item.points ?? []).map((point) => ({
                pointText: point.pointText.trim(),
                displayOrder: point.displayOrder ?? 0,
                isActive: point.isActive ?? true,
                createdBy: data.modifiedBy,
              })),
            },
          },
        });
      }

      return tx.serviceProductContentSection.findUniqueOrThrow({
        where: { serviceProductContentSectionId: sectionId },
        include: rowInclude,
      });
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
    const { serviceProductContentSectionId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductContentSection.delete({ where: { serviceProductContentSectionId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
