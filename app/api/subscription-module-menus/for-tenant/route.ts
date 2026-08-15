import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { filterAdministrationMenusForTenant } from "@/lib/administration-menu-visibility";
import {
  allowedMenuIdsForAccessRole,
  resolveUserAccessRoleScope,
} from "@/lib/access-role-menu-visibility";
import { UserType } from "@/types";

const menuInclude = {
  module: {
    select: {
      subscriptionModuleName: true,
      sortOrder: true,
      showInMenu: true,
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
 * Active menus for modules granted to a tenant (Module Access).
 * Portal modules (showInMenu=false, e.g. B2B/CBT) are excluded from Admin sidebars.
 * Shared Administration menus are included when the tenant has any grant, then
 * filtered by menu→product links vs granted products.
 * When userId is provided, employees/supplier users are further filtered by
 * Access Role CanView. Super Admin and Tenant Admin keep the full grant set.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    const userIdParam = searchParams.get("userId");
    const userId =
      userIdParam != null && userIdParam !== "" ? Number(userIdParam) : NaN;
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
        module: {
          select: {
            subscriptionProductId: true,
            showInMenu: true,
          },
        },
      },
    });

    if (grants.length === 0) {
      return NextResponse.json([]);
    }

    // Product access still counts portal modules (licensing); sidebar menus do not.
    const grantedProductIds = new Set(grants.map((g) => g.module.subscriptionProductId));
    const menuModuleIds = new Set(
      grants.filter((g) => g.module.showInMenu).map((g) => g.subscriptionModuleId)
    );

    const administrationModule = await prisma.subscriptionModule.findFirst({
      where: {
        isActive: true,
        showInMenu: true,
        subscriptionModuleName: "Administration",
        product: { subscriptionProductName: "Administration", isActive: true },
      },
      select: { subscriptionModuleId: true },
    });

    if (administrationModule) {
      menuModuleIds.add(administrationModule.subscriptionModuleId);
    }

    if (menuModuleIds.size === 0) {
      return NextResponse.json([]);
    }

    const rows = await prisma.subscriptionModuleMenu.findMany({
      where: {
        isActive: true,
        subscriptionModuleId: { in: [...menuModuleIds] },
        module: { showInMenu: true, isActive: true },
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

    let filtered = filterAdministrationMenusForTenant({
      menus: rows,
      administrationModuleId: adminModuleId,
      grantedProductIds,
      productLinksByMenuId,
    });

    // Super Admin / Tenant Admin: keep full Module Access menus.
    // Employees and supplier users: filter by Access Role CanView when configured.
    if (Number.isFinite(userId) && userId > 0) {
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { userTypeId: true },
      });
      const isSuperAdmin = user?.userTypeId === UserType.SuperAdmin;
      const isTenantAdmin = user?.userTypeId === UserType.TenantAdmin;

      if (!isSuperAdmin && !isTenantAdmin) {
        const scope = await resolveUserAccessRoleScope(prisma, userId, tenantId);
        if (scope) {
          const allowed = await allowedMenuIdsForAccessRole(
            prisma,
            tenantId,
            scope.companyId,
            scope.accessRoleId,
            filtered.map((m) => ({
              subscriptionModuleMenuId: m.subscriptionModuleMenuId,
              parentMenuId: m.parentMenuId,
            }))
          );
          // null = permissions not configured yet → keep Module Access menus.
          if (allowed) {
            filtered = filtered.filter((m) => allowed.has(m.subscriptionModuleMenuId));
          }
        } else {
          // No Employee / SupplierUser Access Role → no menus.
          filtered = [];
        }
      }
    }

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
