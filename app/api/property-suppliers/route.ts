import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertySupplierInclude, serializePropertySupplierRow } from "@/lib/api/property-supplier-helpers";

/** Flat rows — one per (property, supplier) link. Aggregate client-side into per-supplier grants. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const supplierIdParam = searchParams.get("supplierId");
    const tenantIdParam = searchParams.get("tenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertySupplierWhereInput = {};
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (supplierIdParam) where.supplierId = BigInt(supplierIdParam);
    if (tenantIdParam) where.supplier = { tenantId: Number(tenantIdParam) };
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertySupplier.findMany({
      where,
      include: propertySupplierInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serializePropertySupplierRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}
