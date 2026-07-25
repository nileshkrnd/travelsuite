import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

const createSchema = z.object({
  accessRoleName: z.string().trim().min(1).max(50),
  tenantId: z.number().int().min(0),
  companyId: z.number().int().min(0),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Access Role list — filter by TenantID / CompanyID. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.AccessRoleWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") {
      where.tenantId = Number(tenantIdParam);
    }
    if (companyIdParam != null && companyIdParam !== "") {
      where.companyId = Number(companyIdParam);
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.accessRole.findMany({
      where,
      orderBy: { accessRoleName: "asc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.tenantId === 0 && data.companyId !== 0) {
      return NextResponse.json(
        { error: "CompanyID must be 0 when TenantID is 0" },
        { status: 400 }
      );
    }

    if (data.tenantId > 0) {
      const tenant = await prisma.tenant.findUnique({ where: { tenantId: data.tenantId } });
      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
      }
    }

    const created = await prisma.accessRole.create({
      data: {
        accessRoleName: data.accessRoleName.trim(),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This access role name already exists for this tenant/company" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
