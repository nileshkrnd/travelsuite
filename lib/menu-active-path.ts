import type { MenuItem } from "@/config/permissions";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";

/**
 * Role-scoped href from a Module Menu URL (relative path only).
 * Example: slug=tenantAdmin, path=dashboard → /tenantAdmin/dashboard
 * Never returns a root link like /dashboard.
 */
export function menuItemHref(slug: string, path: string): string {
  const role = slug.replace(/^\/+|\/+$/g, "");
  let clean = normalizeMenuUrl(path);

  // If a role segment was mistakenly stored in Menu URL, strip it.
  if (role && clean.toLowerCase().startsWith(`${role.toLowerCase()}/`)) {
    clean = clean.slice(role.length + 1);
  }
  if (clean.toLowerCase() === role.toLowerCase()) {
    clean = "";
  }

  if (!role) {
    return clean ? `/${clean}` : "/";
  }
  return clean ? `/${role}/${clean}` : `/${role}`;
}

/** Pathname under /{role}/… → relative menu path (lowercase), or null if outside role. */
export function menuPathFromPathname(pathname: string, slug: string): string | null {
  const role = slug.replace(/^\/+|\/+$/g, "");
  if (!role) return null;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const root = `/${role}`;
  if (normalized === root) return "";
  const prefix = `${root}/`;
  if (!normalized.startsWith(prefix)) return null;
  return normalized.slice(prefix.length).toLowerCase();
}

/** True when pathname is this href or a nested route under it (segment-safe). */
export function pathMatchesMenuHref(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const base = href.replace(/\/+$/, "") || "/";
  return path === base || path.startsWith(`${base}/`);
}

/**
 * Among Module Menu paths, pick the longest match for the current pathname
 * so a short URL like `dashboard` does not stay selected on
 * `accounts/dashboard`, `crm/dashboard`, etc.
 */
export function resolveActiveMenuPath(
  pathname: string,
  slug: string,
  paths: string[]
): string | null {
  const current = menuPathFromPathname(pathname, slug);
  if (current == null) return null;

  // Role home with no trailing segment — highlight dashboard when present.
  if (current === "") {
    const dash = paths.map((p) => normalizeMenuUrl(p)).find((p) => p === "dashboard");
    return dash ?? null;
  }

  let best: string | null = null;
  let bestLen = -1;
  for (const raw of paths) {
    const path = normalizeMenuUrl(raw);
    if (!path) continue;
    if (current === path || current.startsWith(`${path}/`)) {
      if (path.length > bestLen) {
        best = path;
        bestLen = path.length;
      }
    }
  }
  return best;
}

export function collectMenuLeafPaths(items: MenuItem[]): string[] {
  const paths: string[] = [];
  function walk(nodes: MenuItem[]) {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children);
      else if (node.path) paths.push(normalizeMenuUrl(node.path));
    }
  }
  walk(items);
  return paths;
}
