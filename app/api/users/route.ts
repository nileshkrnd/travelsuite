import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

const createSchema = z.object({
  username: z.string().trim().min(1).max(200),
  password: z.string().min(6).max(200),
  userDisplayName: z.string().trim().min(1).max(200),
  tenantId: z.number().int().min(0),
  companyId: z.number().int().min(0),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

async function enrich(row: {
  userId: number;
  username: string;
  userDisplayName: string;
  tenantId: number;
  companyId: number;
  lastLoggedInDtTm: Date | null;
  lastPasswordChangeDtTm: Date | null;
  createdBy: number;
  createDtTm: Date;
  modifiedBy: number | null;
  modifiedDtTm: Date | null;
  isActive: boolean;
}) {
  let tenantUid: string | undefined;
  if (row.tenantId > 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: row.tenantId },
      select: { tenantUid: true },
    });
    tenantUid = tenant?.tenantUid;
  }
  return { ...row, tenantUid, companyUid: row.companyId > 0 ? `company_${row.companyId}` : undefined };
}

/** User master list — filter by TenantID / CompanyID (0 = platform). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.UserWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") {
      where.tenantId = Number(tenantIdParam);
    }
    if (companyIdParam != null && companyIdParam !== "") {
      where.companyId = Number(companyIdParam);
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.user.findMany({
      where,
      orderBy: { userDisplayName: "asc" },
    });
    const enriched = await Promise.all(rows.map((row) => enrich(row)));
    return NextResponse.json(enriched);
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

    // Super Admin: TenantID=0 & CompanyID=0
    // Tenant Admin: TenantID>0 & CompanyID=0
    // Employee: TenantID>0 & CompanyID>0
    if (data.tenantId === 0 && data.companyId !== 0) {
      return NextResponse.json(
        { error: "CompanyID must be 0 when TenantID is 0 (Super Admin)" },
        { status: 400 }
      );
    }

    if (data.tenantId > 0) {
      const tenant = await prisma.tenant.findUnique({ where: { tenantId: data.tenantId } });
      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
      }
    }

    const now = new Date();
    const created = await prisma.user.create({
      data: {
        username: data.username.trim().toLowerCase(),
        passwordHash: hashPassword(data.password),
        userDisplayName: data.userDisplayName.trim(),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        lastPasswordChangeDtTm: now,
      },
    });

    return NextResponse.json(await enrich(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This username is already in use" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
