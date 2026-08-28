import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerDocument } from "@/lib/mappers/b2b-customer-related.mapper";

const createSchema = z.object({
  b2bCustomerId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

const include = {
  documentType: { select: { documentTypeName: true } },
  issuingCountry: { select: { countryName: true } },
  status: { select: { statusName: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("b2bCustomerId");
    const where: Prisma.B2BCustomerDocumentWhereInput = {};
    if (customerId) where.b2bCustomerId = BigInt(customerId);
    if (searchParams.get("activeOnly") === "true") where.isActive = true;
    const rows = await prisma.b2BCustomerDocument.findMany({
      where,
      include,
      orderBy: [{ isPrimary: "desc" }, { createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(toAppB2BCustomerDocument));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const customer = await prisma.b2BCustomer.findUnique({ where: { b2bCustomerId: BigInt(data.b2bCustomerId) } });
    if (!customer) return NextResponse.json({ error: "B2B customer not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.b2BCustomerDocument.updateMany({
          where: { b2bCustomerId: BigInt(data.b2bCustomerId), isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerDocument.create({
        data: {
          b2bCustomerId: BigInt(data.b2bCustomerId),
          documentTypeId: BigInt(data.documentTypeId),
          documentNumber: data.documentNumber.trim(),
          issuingCountryId: data.issuingCountryId ?? null,
          issueDate: data.issueDate ? new Date(data.issueDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          documentFileId: data.documentFileId != null ? BigInt(data.documentFileId) : null,
          isPrimary: data.isPrimary ?? false,
          isVerified: data.isVerified ?? false,
          verifiedBy: data.isVerified ? (data.verifiedBy ?? null) : null,
          verifiedDtTm: data.isVerified ? new Date() : null,
          statusId: BigInt(data.statusId),
          remarks: data.remarks?.trim() || null,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerDocument(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
