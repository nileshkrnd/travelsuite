import type { MenuItem } from "@/config/permissions";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import type { SubscriptionModuleMenu } from "@/types";

export type SubscriptionMenuTreeNode = SubscriptionModuleMenu & {
  children: SubscriptionMenuTreeNode[];
};

/** Build a sorted parent/child tree from flat rows (same module only). */
export function buildSubscriptionMenuTree(
  rows: SubscriptionModuleMenu[]
): SubscriptionMenuTreeNode[] {
  const byId = new Map<number, SubscriptionMenuTreeNode>();
  for (const row of rows) {
    byId.set(row.subscriptionModuleMenuId, { ...row, children: [] });
  }

  const roots: SubscriptionMenuTreeNode[] = [];
  for (const node of byId.values()) {
    const parent =
      node.parentMenuId != null ? byId.get(node.parentMenuId) : undefined;
    // Only nest under a parent in the same module — never promote unrelated menus as parents.
    if (
      parent &&
      parent.subscriptionModuleId === node.subscriptionModuleId
    ) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNodes(nodes: SubscriptionMenuTreeNode[]) {
    nodes.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.menuName.localeCompare(b.menuName)
    );
    for (const n of nodes) sortNodes(n.children);
  }
  sortNodes(roots);
  return roots;
}

function mapNode(node: SubscriptionMenuTreeNode): MenuItem {
  const children = node.children.map(mapNode);
  const item: MenuItem = {
    key: `smm-${node.subscriptionModuleMenuId}`,
    labelKey: node.menuName,
    label: node.menuName,
    icon: node.menuIcon || "Layers",
    path: normalizeMenuUrl(node.menuUrl),
  };
  if (children.length > 0) item.children = children;
  return item;
}

/**
 * Tenant sidebar / preview: menu trees from DB.
 * Modules appear in SubscriptionModule.SortOrder, menus in Menu.SortOrder.
 * No extra module-name wrapper (avoids POS → POS / HRMS → HRMS).
 */
export function toSidebarMenuItems(rows: SubscriptionModuleMenu[]): MenuItem[] {
  const active = rows.filter((r) => r.isActive);
  const byModule = new Map<
    number,
    { sortOrder: number; name: string; menus: SubscriptionModuleMenu[] }
  >();

  for (const row of active) {
    let group = byModule.get(row.subscriptionModuleId);
    if (!group) {
      group = {
        sortOrder: row.moduleSortOrder ?? 0,
        name: row.subscriptionModuleName ?? "",
        menus: [],
      };
      byModule.set(row.subscriptionModuleId, group);
    }
    group.menus.push(row);
  }

  const orderedModules = [...byModule.entries()].sort((a, b) => {
    const bySort = a[1].sortOrder - b[1].sortOrder;
    if (bySort !== 0) return bySort;
    return a[1].name.localeCompare(b[1].name);
  });

  const items: MenuItem[] = [];
  for (const [, group] of orderedModules) {
    for (const node of buildSubscriptionMenuTree(group.menus)) {
      items.push(mapNode(node));
    }
  }
  return items;
}

/**
 * Optional: wrap each module as a top-level group. Prefer {@link toSidebarMenuItems}
 * for sidebar links so module name is not duplicated above the root menu.
 */
export function toSidebarMenuItemsGroupedByModule(
  rows: SubscriptionModuleMenu[]
): MenuItem[] {
  const active = rows.filter((r) => r.isActive);
  const byModule = new Map<
    number,
    { name: string; icon: string; menus: SubscriptionModuleMenu[] }
  >();

  for (const row of active) {
    let group = byModule.get(row.subscriptionModuleId);
    if (!group) {
      group = {
        name: row.subscriptionModuleName?.trim() || `Module ${row.subscriptionModuleId}`,
        icon: row.menuIcon || "Layers",
        menus: [],
      };
      byModule.set(row.subscriptionModuleId, group);
    }
    group.menus.push(row);
    if (row.parentMenuId == null && row.menuIcon) {
      group.icon = row.menuIcon;
    }
  }

  return [...byModule.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([moduleId, group]) => {
      const children = buildSubscriptionMenuTree(group.menus).map(mapNode);
      const item: MenuItem = {
        key: `module-${moduleId}`,
        labelKey: group.name,
        label: group.name,
        icon: group.icon || "Layers",
        path: children[0]?.path || `module/${moduleId}`,
      };
      if (children.length > 0) item.children = children;
      return item;
    })
    .filter((item) => (item.children?.length ?? 0) > 0);
}
