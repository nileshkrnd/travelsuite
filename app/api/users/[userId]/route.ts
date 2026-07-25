import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  username: z.string().trim().min(1).max(200),
  password: z.string().min(6).max(200).optional(),
  userDisplayName: z.string().trim().min(1).max(200),
  tenantId: z.number().int().min(0),
  companyId: z.number().int().min(0),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

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

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const row = await prisma.user.findUnique({ where: { userId: id.data } });
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(await enrich(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.tenantId === 0 && data.companyId !== 0) {
      return NextResponse.json(
        { error: "CompanyID must be 0 when TenantID is 0 (Super Admin)" },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { userId: id.data },
      data: {
        username: data.username.trim().toLowerCase(),
        userDisplayName: data.userDisplayName.trim(),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: now,
        ...(data.password
          ? { passwordHash: hashPassword(data.password), lastPasswordChangeDtTm: now }
          : {}),
      },
    });
    return NextResponse.json(await enrich(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This username is already in use" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { userId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(await enrich(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
