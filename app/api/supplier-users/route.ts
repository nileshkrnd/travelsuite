import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { hashPassword } from "@/lib/password";
import { UserType } from "@/types";
import { serializeSupplierUserRow, supplierUserInclude, validateSupplierUserLookups } from "@/lib/api/supplier-user-helpers";

const createSchema = z.object({
  supplierId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  dialCountryCode: z.string().trim().max(10).nullable().optional(),
  mobileNumber: z.string().trim().max(30).nullable().optional(),
  accessRoleId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(200),
  createdBy: z.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierIdParam = searchParams.get("supplierId");
    const tenantIdParam = searchParams.get("tenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.SupplierUserWhereInput = {};
    if (supplierIdParam) where.supplierId = BigInt(supplierIdParam);
    if (tenantIdParam) {
      const tenantId = Number(tenantIdParam);
      if (Number.isFinite(tenantId) && tenantId > 0) {
        where.supplier = { tenantId, isDeleted: false };
      }
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.supplierUser.findMany({
      where,
      include: supplierUserInclude,
      orderBy: [{ createdDate: "desc" }],
    });
    return NextResponse.json(rows.map(serializeSupplierUserRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Creates a SupplierUser AND its linked login User row in one transaction. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookup = await validateSupplierUserLookups(data);
    if (lookup instanceof NextResponse) return lookup;
    const { supplier } = lookup;

    const username = data.email.trim().toLowerCase();
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash: hashPassword(data.password),
          userDisplayName: displayName,
          userTypeId: UserType.SupplierUser,
          tenantId: supplier.tenantId,
          companyId: supplier.companyId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
          lastPasswordChangeDtTm: new Date(),
        },
      });

      return tx.supplierUser.create({
        data: {
          supplierId: BigInt(data.supplierId),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: username,
          dialCountryCode: data.dialCountryCode?.trim() || null,
          mobileNumber: data.mobileNumber?.trim() || null,
          accessRoleId: data.accessRoleId,
          userId: user.userId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include: supplierUserInclude,
      });
    });

    return NextResponse.json(serializeSupplierUserRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.toLowerCase().includes("username")) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "This email is already registered for this supplier" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
