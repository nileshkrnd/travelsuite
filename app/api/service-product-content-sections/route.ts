import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

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

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  contentSectionTypeId: z.number().int().positive(),
  sectionTitle: z.string().trim().min(1).max(250),
  sectionDescription: z.string().trim().max(10000).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  items: z.array(itemSchema).optional(),
  createdBy: z.number().int().positive(),
});

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  contentSectionType: { select: { sectionTypeCode: true, sectionTypeName: true, isStepBased: true } },
  items: {
    orderBy: [{ displayOrder: "asc" as const }],
    include: { points: { orderBy: [{ displayOrder: "asc" as const }] } },
  },
};

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductContentSectionWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductContentSection.findMany({
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

    const type = await prisma.contentSectionTypeMaster.findUnique({
      where: { contentSectionTypeId: BigInt(data.contentSectionTypeId) },
    });
    if (!type) return NextResponse.json({ error: "Content section type not found" }, { status: 400 });

    const created = await prisma.serviceProductContentSection.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        contentSectionTypeId: BigInt(data.contentSectionTypeId),
        sectionTitle: data.sectionTitle.trim(),
        sectionDescription: data.sectionDescription?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        items: {
          create: (data.items ?? []).map((item) => ({
            itemTitle: item.itemTitle.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            displayOrder: item.displayOrder ?? 0,
            isActive: item.isActive ?? true,
            createdBy: data.createdBy,
            points: {
              create: (item.points ?? []).map((point) => ({
                pointText: point.pointText.trim(),
                displayOrder: point.displayOrder ?? 0,
                isActive: point.isActive ?? true,
                createdBy: data.createdBy,
              })),
            },
          })),
        },
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
