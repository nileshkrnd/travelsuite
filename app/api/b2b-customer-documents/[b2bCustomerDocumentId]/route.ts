import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerDocument } from "@/lib/mappers/b2b-customer-related.mapper";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  documentTypeId: z.number().int().positive(),
  documentNumber: z.string().trim().min(1).max(100),
  issuingCountryId: z.number().int().positive().nullable().optional(),
  issueDate: z.string().trim().min(1).nullable().optional(),
  expiryDate: z.string().trim().min(1).nullable().optional(),
  documentFileId: z.number().int().positive().nullable().optional(),
  isPrimary: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  verifiedBy: z.number().int().positive().nullable().optional(),
  statusId: z.number().int().positive(),
  remarks: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const include = {
  documentType: { select: { documentTypeName: true } },
  issuingCountry: { select: { countryName: true } },
  status: { select: { statusName: true } },
} as const;
type RouteContext = { params: Promise<{ b2bCustomerDocumentId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerDocumentId);
    if (!id.success) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const existing = await prisma.b2BCustomerDocument.findUnique({ where: { b2bCustomerDocumentId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const nowVerified = data.isVerified ?? existing.isVerified;
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.b2BCustomerDocument.updateMany({
          where: { b2bCustomerId: existing.b2bCustomerId, isPrimary: true, b2bCustomerDocumentId: { not: BigInt(id.data) } },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerDocument.update({
        where: { b2bCustomerDocumentId: BigInt(id.data) },
        data: {
          documentTypeId: BigInt(data.documentTypeId),
          documentNumber: data.documentNumber.trim(),
          issuingCountryId: data.issuingCountryId ?? null,
          issueDate: data.issueDate ? new Date(data.issueDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          documentFileId: data.documentFileId != null ? BigInt(data.documentFileId) : null,
          isPrimary: data.isPrimary ?? existing.isPrimary,
          isVerified: nowVerified,
          verifiedBy: nowVerified ? (data.verifiedBy ?? existing.verifiedBy) : null,
          verifiedDtTm: nowVerified ? (existing.isVerified ? existing.verifiedDtTm : new Date()) : null,
          statusId: BigInt(data.statusId),
          remarks: data.remarks?.trim() || null,
          isActive: data.isActive ?? existing.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerDocument(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerDocumentId);
    if (!id.success) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    await prisma.b2BCustomerDocument.delete({ where: { b2bCustomerDocumentId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
