import type { MenuItem } from "@/config/permissions";

/** Role-scoped href for a menu path segment (e.g. tenantAdmin + dashboard). */
export function menuItemHref(slug: string, path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `/${slug}/${clean}` : `/${slug}`;
}

/** True when pathname is this href or a nested route under it. */
export function pathMatchesMenuHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Among candidate paths, pick the longest match for pathname so a short path
 * like `dashboard` does not stay selected when a more specific menu matches.
 */
export function resolveActiveMenuPath(
  pathname: string,
  slug: string,
  paths: string[]
): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const path of paths) {
    const href = menuItemHref(slug, path);
    if (!pathMatchesMenuHref(pathname, href)) continue;
    if (path.length > bestLen) {
      best = path;
      bestLen = path.length;
    }
  }
  return best;
}

export function collectMenuLeafPaths(items: MenuItem[]): string[] {
  const paths: string[] = [];
  function walk(nodes: MenuItem[]) {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children);
      else if (node.path) paths.push(node.path);
    }
  }
  walk(items);
  return paths;
}
