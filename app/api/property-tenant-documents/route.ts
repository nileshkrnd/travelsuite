import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyTenantId: z.number().int().positive(),
  identityDocumentCountryId: z.number().int().positive(),
  documentNumber: z.string().trim().min(1).max(100),
  issueDate: z.string().trim().min(1).nullable().optional(),
  expiryDate: z.string().trim().min(1).nullable().optional(),
  documentFileUrl: z.string().trim().max(500).nullable().optional(),
  isPrimary: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  verifiedBy: z.number().int().positive().nullable().optional(),
  statusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  identityDocumentCountry: { select: { documentDisplayName: true, documentShortName: true } },
  status: { select: { statusName: true } },
} as const;

function serialize<T extends { propertyTenantDocumentId: bigint; propertyTenantId: bigint; identityDocumentCountryId: bigint; statusId: bigint }>(
  row: T
) {
  return {
    ...row,
    propertyTenantDocumentId: Number(row.propertyTenantDocumentId),
    propertyTenantId: Number(row.propertyTenantId),
    identityDocumentCountryId: Number(row.identityDocumentCountryId),
    statusId: Number(row.statusId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyTenantIdParam = searchParams.get("propertyTenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyTenantDocumentWhereInput = {};
    if (propertyTenantIdParam != null && propertyTenantIdParam !== "") where.propertyTenantId = BigInt(propertyTenantIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyTenantDocument.findMany({
      where,
      include: rowInclude,
      orderBy: [{ createdDtTm: "desc" }],
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

    const tenant = await prisma.propertyTenant.findUnique({ where: { propertyTenantId: BigInt(data.propertyTenantId) } });
    if (!tenant) return NextResponse.json({ error: "Property tenant not found" }, { status: 400 });

    const created = await prisma.propertyTenantDocument.create({
      data: {
        propertyTenantId: BigInt(data.propertyTenantId),
        identityDocumentCountryId: BigInt(data.identityDocumentCountryId),
        documentNumber: data.documentNumber.trim(),
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentFileUrl: data.documentFileUrl?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        isVerified: data.isVerified ?? false,
        verifiedBy: data.isVerified ? (data.verifiedBy ?? null) : null,
        verifiedDtTm: data.isVerified ? new Date() : null,
        statusId: BigInt(data.statusId),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
