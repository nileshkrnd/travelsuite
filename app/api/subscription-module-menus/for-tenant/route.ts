import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { filterAdministrationMenusForTenant } from "@/lib/administration-menu-visibility";

const menuInclude = {
  module: {
    select: {
      subscriptionModuleName: true,
      sortOrder: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
  parent: { select: { menuName: true } },
  productLinks: {
    select: {
      subscriptionProductId: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
} as const;

/**
 * Active menus for modules actively granted to a tenant (Module Access).
 * Shared Administration menus are always included when the tenant has any grant,
 * then filtered by menu→product links vs granted products.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const grants = await prisma.subscriptionModuleAccess.findMany({
      where: {
        tenantId,
        isActive: true,
        module: { isActive: true },
      },
      select: {
        subscriptionModuleId: true,
        module: { select: { subscriptionProductId: true } },
      },
    });

    if (grants.length === 0) {
      return NextResponse.json([]);
    }

    const grantedModuleIds = grants.map((g) => g.subscriptionModuleId);
    const grantedProductIds = new Set(
      grants.map((g) => g.module.subscriptionProductId)
    );

    const administrationModule = await prisma.subscriptionModule.findFirst({
      where: {
        isActive: true,
        subscriptionModuleName: "Administration",
        product: { subscriptionProductName: "Administration", isActive: true },
      },
      select: { subscriptionModuleId: true },
    });

    const moduleIds = new Set(grantedModuleIds);
    if (administrationModule) {
      moduleIds.add(administrationModule.subscriptionModuleId);
    }

    const rows = await prisma.subscriptionModuleMenu.findMany({
      where: {
        isActive: true,
        subscriptionModuleId: { in: [...moduleIds] },
      },
      include: menuInclude,
      orderBy: [{ sortOrder: "asc" }, { menuName: "asc" }],
    });

    const adminModuleId = administrationModule?.subscriptionModuleId ?? null;
    const productLinksByMenuId = new Map<number, number[]>();
    for (const row of rows) {
      if (adminModuleId != null && row.subscriptionModuleId === adminModuleId) {
        productLinksByMenuId.set(
          row.subscriptionModuleMenuId,
          row.productLinks.map((l) => l.subscriptionProductId)
        );
      }
    }

    const filtered = filterAdministrationMenusForTenant({
      menus: rows,
      administrationModuleId: adminModuleId,
      grantedProductIds,
      productLinksByMenuId,
    });

    filtered.sort((a, b) => {
      const ma = a.module.sortOrder - b.module.sortOrder;
      if (ma !== 0) return ma;
      const sa = a.sortOrder - b.sortOrder;
      if (sa !== 0) return sa;
      return a.menuName.localeCompare(b.menuName);
    });

    return NextResponse.json(filtered);
  } catch (error) {
    return dbUnavailable(error);
  }
}
