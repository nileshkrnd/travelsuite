import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import {
  MENU_ITEMS,
  GLOBAL_TENANT_SETTING_KEYS,
  type MenuItem,
  type ModuleKey,
} from "@/config/permissions";

export { normalizeMenuUrl };

/** Always visible for tenant workspaces (setup + home), independent of subscription modules. */
export const TENANT_CORE_MENU_KEYS: ModuleKey[] = ["dashboard", "administration"];

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
  key: ModuleKey;
  label: string;
  path: string;
  depth: number;
};

/** Flat list of app menus that can be linked to a subscription module. */
export function listAssignableMenuOptions(
  labelForKey: (key: ModuleKey) => string = (key) => key
): AssignableMenuOption[] {
  const options: AssignableMenuOption[] = [];

  function walk(items: MenuItem[], depth: number) {
    for (const item of items) {
      if (item.key === "globalTenantSettings" || GLOBAL_TENANT_SETTING_KEYS.includes(item.key)) {
        continue;
      }
      if (item.key === "dashboard") continue;
      options.push({
        key: item.key,
        label: labelForKey(item.key),
        path: item.path,
        depth,
      });
      if (item.children) walk(item.children, depth + 1);
    }
  }

  walk(MENU_ITEMS, 0);
  return options;
}

/** Keep only menus covered by granted module MenuURLs (plus core tenant menus). */
export function filterMenuItemsByUrls(
  items: MenuItem[],
  allowedUrls: Set<string>,
  alwaysKeys: Set<ModuleKey> = new Set(TENANT_CORE_MENU_KEYS)
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
