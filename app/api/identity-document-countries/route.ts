import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  identityDocumentTypeId: z.number().int().positive(),
  countryId: z.number().int().positive(),
  documentDisplayName: z.string().trim().min(1).max(150),
  documentShortName: z.string().trim().max(50).nullable().optional(),
  issuingAuthority: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  documentType: { select: { documentTypeName: true } },
  country: { select: { countryName: true } },
} as const;

function serialize<T extends { identityDocumentCountryId: bigint; identityDocumentTypeId: bigint }>(row: T) {
  return { ...row, identityDocumentCountryId: Number(row.identityDocumentCountryId), identityDocumentTypeId: Number(row.identityDocumentTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeIdParam = searchParams.get("identityDocumentTypeId");
    const countryIdParam = searchParams.get("countryId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.IdentityDocumentCountryMasterWhereInput = {};
    if (typeIdParam != null && typeIdParam !== "") where.identityDocumentTypeId = BigInt(typeIdParam);
    if (countryIdParam != null && countryIdParam !== "") where.countryId = Number(countryIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.identityDocumentCountryMaster.findMany({
      where,
      include: rowInclude,
      orderBy: [{ documentDisplayName: "asc" }],
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

    const type = await prisma.identityDocumentTypeMaster.findUnique({ where: { identityDocumentTypeId: BigInt(data.identityDocumentTypeId) } });
    if (!type) return NextResponse.json({ error: "Document type not found" }, { status: 400 });

    const created = await prisma.identityDocumentCountryMaster.create({
      data: {
        identityDocumentTypeId: BigInt(data.identityDocumentTypeId),
        countryId: data.countryId,
        documentDisplayName: data.documentDisplayName.trim(),
        documentShortName: data.documentShortName?.trim() || null,
        issuingAuthority: data.issuingAuthority?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This document type already has a mapping for this country" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
