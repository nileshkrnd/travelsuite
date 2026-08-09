import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const supplierUserInclude = {
  supplier: { select: { supplierName: true } },
  accessRole: { select: { accessRoleName: true } },
} as const;

type SerializableRow = { supplierUserId: bigint; supplierId: bigint; [key: string]: unknown };

export function serializeSupplierUserRow<T extends SerializableRow>(row: T) {
  return { ...row, supplierUserId: Number(row.supplierUserId), supplierId: Number(row.supplierId) };
}

/** Validates the AccessRole belongs to the same tenant/company as the Supplier. */
export async function validateSupplierUserLookups(data: {
  supplierId: number;
  accessRoleId: number;
}): Promise<NextResponse | { supplier: { tenantId: number; companyId: number } }> {
  const supplier = await prisma.supplier.findFirst({
    where: { supplierId: BigInt(data.supplierId), isDeleted: false },
    select: { tenantId: true, companyId: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

  // CompanyID = 0 is a tenant-wide sentinel (matches User.companyId's convention) — such roles apply to every company.
  const accessRole = await prisma.accessRole.findFirst({
    where: {
      accessRoleId: data.accessRoleId,
      tenantId: supplier.tenantId,
      companyId: { in: [0, supplier.companyId] },
    },
  });
  if (!accessRole) {
    return NextResponse.json({ error: "Access role not found for this supplier's company" }, { status: 400 });
  }

  return { supplier };
}
