/**
 * Filter shared Administration menus by linked Subscription Products vs tenant grants.
 * Non-admin menus pass through unchanged.
 */

export type AdminMenuFilterRow = {
  subscriptionModuleMenuId: number;
  subscriptionModuleId: number;
  parentMenuId: number | null;
  menuUrl: string;
};

/**
 * Keep Administration menus that are common (no product links) or linked to any
 * product the tenant has via Module Access. Then prune parents with no visible
 * descendants. Non-admin module menus are always kept.
 */
export function filterAdministrationMenusForTenant<T extends AdminMenuFilterRow>(options: {
  menus: T[];
  administrationModuleId: number | null;
  /** Product IDs the tenant can access (via any granted module). */
  grantedProductIds: Set<number>;
  /** menuId → linked product IDs (empty array = common). */
  productLinksByMenuId: Map<number, number[]>;
}): T[] {
  const { menus, administrationModuleId, grantedProductIds, productLinksByMenuId } = options;
  if (administrationModuleId == null) return menus;

  const adminMenuIds = new Set(
    menus
      .filter((m) => m.subscriptionModuleId === administrationModuleId)
      .map((m) => m.subscriptionModuleMenuId)
  );

  const independentlyVisible = new Set<number>();
  for (const menu of menus) {
    if (menu.subscriptionModuleId !== administrationModuleId) {
      independentlyVisible.add(menu.subscriptionModuleMenuId);
      continue;
    }
    const links = productLinksByMenuId.get(menu.subscriptionModuleMenuId) ?? [];
    if (links.length === 0) {
      independentlyVisible.add(menu.subscriptionModuleMenuId);
      continue;
    }
    if (links.some((productId) => grantedProductIds.has(productId))) {
      independentlyVisible.add(menu.subscriptionModuleMenuId);
    }
  }

  // Keep parents if any descendant is independently visible.
  const byId = new Map(menus.map((m) => [m.subscriptionModuleMenuId, m]));
  const keep = new Set<number>(independentlyVisible);

  for (const menuId of independentlyVisible) {
    let cursor = byId.get(menuId)?.parentMenuId ?? null;
    while (cursor != null) {
      if (keep.has(cursor)) break;
      if (!adminMenuIds.has(cursor)) break;
      keep.add(cursor);
      cursor = byId.get(cursor)?.parentMenuId ?? null;
    }
  }

  return menus.filter((m) => {
    if (m.subscriptionModuleId !== administrationModuleId) return true;
    return keep.has(m.subscriptionModuleMenuId);
  });
}
