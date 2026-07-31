import type { PrismaClient } from "@prisma/client";
import { UserType } from "@/types";

type Db = PrismaClient;

/**
 * Resolve which Access Role + company scope drives menu permissions for a user.
 * Prefer Employee.accessRoleId; Tenant Admin falls back to Access Role named "Tenant Admin".
 */
export async function resolveUserAccessRoleScope(
  db: Db,
  userId: number,
  tenantId: number
): Promise<{ accessRoleId: number; companyId: number } | null> {
  const user = await db.user.findUnique({
    where: { userId },
    select: {
      userTypeId: true,
      tenantId: true,
      companyId: true,
      employee: {
        select: {
          accessRoleId: true,
          companyId: true,
          tenantId: true,
          isActive: true,
        },
      },
    },
  });
  if (!user || user.tenantId !== tenantId) return null;

  if (user.employee?.isActive) {
    return {
      accessRoleId: user.employee.accessRoleId,
      companyId: user.employee.companyId,
    };
  }

  // Tenant Admin (and similar companyKey=0) → Access Role "Tenant Admin" for the tenant.
  if (user.userTypeId === UserType.TenantAdmin || user.companyId === 0) {
    const role = await db.accessRole.findFirst({
      where: {
        tenantId,
        companyId: 0,
        isActive: true,
        accessRoleName: "Tenant Admin",
      },
      select: { accessRoleId: true },
    });
    if (role) return { accessRoleId: role.accessRoleId, companyId: 0 };
  }

  return null;
}

/**
 * Menu IDs the role may see (CanView + IsActive), including ancestors so trees stay intact.
 * Returns null when no permission rows exist yet (caller should leave menus unfiltered).
 */
export async function allowedMenuIdsForAccessRole(
  db: Db,
  tenantId: number,
  companyId: number,
  accessRoleId: number,
  menus: { subscriptionModuleMenuId: number; parentMenuId: number | null }[]
): Promise<Set<number> | null> {
  // Prefer company-scoped rows; also load tenant-wide (companyId=0) as fallback fills.
  const rows = await db.tenantAccessRoleMenuPermission.findMany({
    where: {
      tenantId,
      accessRoleId,
      companyId: companyId > 0 ? { in: [companyId, 0] } : 0,
    },
    select: {
      companyId: true,
      subscriptionModuleMenuId: true,
      canView: true,
      isActive: true,
    },
  });

  if (rows.length === 0) return null;

  // Company-specific overrides tenant-wide for the same menu.
  const byMenu = new Map<number, { canView: boolean; isActive: boolean; companyId: number }>();
  for (const row of rows) {
    const existing = byMenu.get(row.subscriptionModuleMenuId);
    if (!existing || row.companyId > existing.companyId) {
      byMenu.set(row.subscriptionModuleMenuId, row);
    }
  }

  const allowed = new Set<number>();
  for (const [menuId, flags] of byMenu) {
    if (flags.canView && flags.isActive) allowed.add(menuId);
  }

  const byId = new Map(menus.map((m) => [m.subscriptionModuleMenuId, m]));
  for (const menuId of [...allowed]) {
    let parentId = byId.get(menuId)?.parentMenuId ?? null;
    const seen = new Set<number>();
    while (parentId != null && !seen.has(parentId)) {
      seen.add(parentId);
      allowed.add(parentId);
      parentId = byId.get(parentId)?.parentMenuId ?? null;
    }
  }

  return allowed;
}
