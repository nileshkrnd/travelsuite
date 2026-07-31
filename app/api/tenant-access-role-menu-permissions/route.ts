import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    {
      error: `Database unavailable: ${message}. Ensure PostgreSQL is running and ADMINCNX_URL is set.`,
    },
    { status: 503 }
  );
}

const INCLUDE = {
  accessRole: { select: { accessRoleName: true } },
  menu: { select: { menuName: true, menuUrl: true } },
} as const;

const flagsSchema = z.object({
  subscriptionModuleMenuId: z.number().int().positive(),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canApprove: z.boolean(),
  canExport: z.boolean(),
  canPrint: z.boolean(),
  canReadOnly: z.boolean(),
  isActive: z.boolean(),
});

const batchSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().min(0),
  accessRoleId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  modifiedBy: z.number().int().positive(),
  rows: z.array(flagsSchema),
});

/** List permissions for a tenant + company + access role matrix. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    const companyId = Number(searchParams.get("companyId"));
    const accessRoleId = Number(searchParams.get("accessRoleId"));

    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }
    if (!Number.isFinite(companyId) || companyId < 0) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    if (!Number.isFinite(accessRoleId) || accessRoleId <= 0) {
      return NextResponse.json({ error: "accessRoleId is required" }, { status: 400 });
    }

    const rows = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: { tenantId, companyId, accessRoleId },
      include: INCLUDE,
      orderBy: { subscriptionModuleMenuId: "asc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Batch upsert permission rows for one Access Role scope. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const role = await prisma.accessRole.findUnique({
      where: { accessRoleId: data.accessRoleId },
    });
    if (!role || role.tenantId !== data.tenantId) {
      return NextResponse.json({ error: "Access role not found for this tenant" }, { status: 400 });
    }

    const menuIds = [...new Set(data.rows.map((r) => r.subscriptionModuleMenuId))];
    if (menuIds.length > 0) {
      const menus = await prisma.subscriptionModuleMenu.findMany({
        where: { subscriptionModuleMenuId: { in: menuIds } },
        select: { subscriptionModuleMenuId: true },
      });
      if (menus.length !== menuIds.length) {
        return NextResponse.json({ error: "One or more menus were not found" }, { status: 400 });
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const row of data.rows) {
        await tx.tenantAccessRoleMenuPermission.upsert({
          where: {
            tenantId_companyId_accessRoleId_subscriptionModuleMenuId: {
              tenantId: data.tenantId,
              companyId: data.companyId,
              accessRoleId: data.accessRoleId,
              subscriptionModuleMenuId: row.subscriptionModuleMenuId,
            },
          },
          create: {
            tenantId: data.tenantId,
            companyId: data.companyId,
            accessRoleId: data.accessRoleId,
            subscriptionModuleMenuId: row.subscriptionModuleMenuId,
            canView: row.canView,
            canCreate: row.canCreate,
            canEdit: row.canEdit,
            canDelete: row.canDelete,
            canApprove: row.canApprove,
            canExport: row.canExport,
            canPrint: row.canPrint,
            canReadOnly: row.canReadOnly,
            isActive: row.isActive,
            createdBy: data.createdBy,
          },
          update: {
            canView: row.canView,
            canCreate: row.canCreate,
            canEdit: row.canEdit,
            canDelete: row.canDelete,
            canApprove: row.canApprove,
            canExport: row.canExport,
            canPrint: row.canPrint,
            canReadOnly: row.canReadOnly,
            isActive: row.isActive,
            modifiedBy: data.modifiedBy,
            modifiedDtTm: now,
          },
        });
      }
    });

    const rows = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        accessRoleId: data.accessRoleId,
      },
      include: INCLUDE,
      orderBy: { subscriptionModuleMenuId: "asc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}
