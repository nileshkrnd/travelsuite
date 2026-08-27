import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ propertyTenantDocumentId: string }> };

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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyTenantDocumentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await prisma.propertyTenantDocument.findUnique({ where: { propertyTenantDocumentId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const wasVerified = existing.isVerified;
    const nowVerified = data.isVerified ?? existing.isVerified;

    const updated = await prisma.propertyTenantDocument.update({
      where: { propertyTenantDocumentId: BigInt(id.data) },
      data: {
        identityDocumentCountryId: BigInt(data.identityDocumentCountryId),
        documentNumber: data.documentNumber.trim(),
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentFileUrl: data.documentFileUrl?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        isVerified: nowVerified,
        verifiedBy: nowVerified ? (data.verifiedBy ?? existing.verifiedBy) : null,
        verifiedDtTm: nowVerified ? (wasVerified ? existing.verifiedDtTm : new Date()) : null,
        statusId: BigInt(data.statusId),
        isActive: data.isActive ?? true,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyTenantDocumentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });

    await prisma.propertyTenantDocument.delete({ where: { propertyTenantDocumentId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
