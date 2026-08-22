import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const upsertSchema = z.object({
  serviceProductId: z.number().int().positive(),
  metaTitle: z.string().trim().max(70).nullable().optional(),
  metaDescription: z.string().trim().max(320).nullable().optional(),
  metaKeywords: z.string().trim().max(500).nullable().optional(),
  focusKeyword: z.string().trim().max(150).nullable().optional(),
  canonicalUrl: z.string().trim().max(500).nullable().optional(),
  ogTitle: z.string().trim().max(70).nullable().optional(),
  ogDescription: z.string().trim().max(320).nullable().optional(),
  ogImageUrl: z.string().trim().max(500).nullable().optional(),
  isIndexable: z.boolean().optional(),
  isFollowable: z.boolean().optional(),
  actorId: z.number().int().positive(),
});

function serialize<T extends { serviceProductSeoId: bigint; serviceProductId: bigint }>(row: T) {
  return {
    ...row,
    serviceProductSeoId: Number(row.serviceProductSeoId),
    serviceProductId: Number(row.serviceProductId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceProductIdParam = searchParams.get("serviceProductId");
    if (!serviceProductIdParam) {
      return NextResponse.json({ error: "serviceProductId is required" }, { status: 400 });
    }
    const row = await prisma.serviceProductSeo.findUnique({
      where: { serviceProductId: BigInt(serviceProductIdParam) },
    });
    return NextResponse.json(row ? serialize(row) : null);
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Upserts the single SEO row for a Service Product. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }

    const flags = {
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      metaKeywords: data.metaKeywords?.trim() || null,
      focusKeyword: data.focusKeyword?.trim() || null,
      canonicalUrl: data.canonicalUrl?.trim() || null,
      ogTitle: data.ogTitle?.trim() || null,
      ogDescription: data.ogDescription?.trim() || null,
      ogImageUrl: data.ogImageUrl?.trim() || null,
      isIndexable: data.isIndexable ?? true,
      isFollowable: data.isFollowable ?? true,
    };

    const row = await prisma.serviceProductSeo.upsert({
      where: { serviceProductId: BigInt(data.serviceProductId) },
      create: {
        serviceProductId: BigInt(data.serviceProductId),
        ...flags,
        createdBy: data.actorId,
      },
      update: {
        ...flags,
        modifiedBy: data.actorId,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(serialize(row), { status: 200 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
