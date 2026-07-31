import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import { toSidebarMenuItems } from "@/lib/subscription-module-menu-tree";
import {
  MENU_ITEMS,
  GLOBAL_TENANT_SETTING_KEYS,
  type MenuItem,
  type ModuleKey,
} from "@/config/permissions";
import type { SubscriptionModuleMenu } from "@/types";

export { normalizeMenuUrl };

/** No hard-coded tenant menus — everything comes from Module Access + Module Menu (DB). */
export const TENANT_CORE_MENU_KEYS: ModuleKey[] = [];

const TENANT_CORE_KEY_SET = new Set<string>(TENANT_CORE_MENU_KEYS);

/** @deprecated Prefer Module Access menus from DB. Kept for helpers that filter role menus. */
export function getTenantCoreMenuItems(roleMenus: MenuItem[]): MenuItem[] {
  return roleMenus.filter((item) => TENANT_CORE_KEY_SET.has(item.key));
}

/**
 * Tenant workspace sidebar: menu trees from DB only (no extra module-name wrapper).
 * Parent/child nesting stays within each module's menus.
 */
export function buildTenantWorkspaceMenus(
  _roleMenus: MenuItem[],
  grantedModuleMenus: SubscriptionModuleMenu[]
): MenuItem[] {
  return toSidebarMenuItems(grantedModuleMenus);
}

export function isMenuPathAllowed(itemPath: string, allowedUrls: Set<string>): boolean {
  const path = normalizeMenuUrl(itemPath);
  if (!path) return false;
  for (const allowed of allowedUrls) {
    if (!allowed) continue;
    if (path === allowed || path.startsWith(`${allowed}/`) || allowed.startsWith(`${path}/`)) {
      return true;
    }
  }
  return false;
}

export type AssignableMenuOption = {
  key: ModuleKey | string;
  label: string;
  path: string;
  depth: number;
};

/** App menu tree (excludes Super Admin platform masters). */
export function getAssignableMenuTree(): MenuItem[] {
  function filter(items: MenuItem[]): MenuItem[] {
    return items.reduce<MenuItem[]>((acc, item) => {
      if (item.key === "globalTenantSettings" || GLOBAL_TENANT_SETTING_KEYS.includes(item.key as ModuleKey)) {
        return acc;
      }
      if (item.key === "dashboard") return acc;
      if (item.children?.length) {
        const children = filter(item.children);
        acc.push({ ...item, children });
        return acc;
      }
      acc.push(item);
      return acc;
    }, []);
  }
  return filter(MENU_ITEMS);
}

/** Flat list of app menus that can be linked to a subscription module. */
export function listAssignableMenuOptions(
  labelForKey: (key: ModuleKey | string) => string = (key) => key
): AssignableMenuOption[] {
  const options: AssignableMenuOption[] = [];

  function walk(items: MenuItem[], depth: number) {
    for (const item of items) {
      options.push({
        key: item.key,
        label: labelForKey(item.key),
        path: item.path,
        depth,
      });
      if (item.children) walk(item.children, depth + 1);
    }
  }

  walk(getAssignableMenuTree(), 0);
  return options;
}

/** Sibling menu items under the same parent path (null = top-level). */
export function getSiblingMenuItems(parentPath: string | null): MenuItem[] {
  const tree = getAssignableMenuTree();
  if (!parentPath) return tree;
  const normalizedParent = normalizeMenuUrl(parentPath);

  function findChildren(items: MenuItem[]): MenuItem[] | null {
    for (const item of items) {
      if (normalizeMenuUrl(item.path) === normalizedParent) return item.children ?? [];
      if (item.children?.length) {
        const nested = findChildren(item.children);
        if (nested) return nested;
      }
    }
    return null;
  }

  return findChildren(tree) ?? [];
}

/** Keep only menus covered by granted module MenuURLs (plus core tenant menus). */
export function filterMenuItemsByUrls(
  items: MenuItem[],
  allowedUrls: Set<string>,
  alwaysKeys: Set<string> = TENANT_CORE_KEY_SET
): MenuItem[] {
  return items.reduce<MenuItem[]>((acc, item) => {
    if (alwaysKeys.has(item.key)) {
      acc.push(item);
      return acc;
    }

    if (item.children?.length) {
      if (isMenuPathAllowed(item.path, allowedUrls)) {
        acc.push(item);
        return acc;
      }
      const children = filterMenuItemsByUrls(item.children, allowedUrls, alwaysKeys);
      if (children.length > 0) {
        acc.push({ ...item, children });
      }
      return acc;
    }

    if (isMenuPathAllowed(item.path, allowedUrls)) {
      acc.push(item);
    }
    return acc;
  }, []);
}
