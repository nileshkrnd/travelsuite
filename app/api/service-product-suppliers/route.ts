import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  supplierProductCode: z.string().trim().max(100).optional(),
  isPrimary: z.boolean().optional(),
  validFrom: z.string().trim().min(1).optional().nullable(),
  validTo: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplier: { select: { supplierName: true } },
} as const;

function toRow<T extends { serviceProductSupplierId: bigint; serviceProductId: bigint; supplierId: bigint }>(row: T) {
  return { ...row, serviceProductSupplierId: Number(row.serviceProductSupplierId), serviceProductId: Number(row.serviceProductId), supplierId: Number(row.supplierId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const supplierIdParam = searchParams.get("supplierId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductSupplierWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (supplierIdParam != null && supplierIdParam !== "") where.supplierId = BigInt(supplierIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductSupplier.findMany({
      where,
      include: rowInclude,
      orderBy: [{ isPrimary: "desc" }, { createdDtTm: "asc" }],
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

    const supplier = await prisma.supplier.findUnique({ where: { supplierId: BigInt(data.supplierId) } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

    const created = await prisma.serviceProductSupplier.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        supplierId: BigInt(data.supplierId),
        supplierProductCode: data.supplierProductCode?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This supplier is already linked to this service product" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
