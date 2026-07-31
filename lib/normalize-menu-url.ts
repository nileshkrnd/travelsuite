/**
 * Pure menu URL normalizer — no imports from permissions/roles (avoids circular init).
 *
 * Module Menu URLs are relative app paths, e.g.:
 *   dashboard | facility/dashboard | masters/company
 *
 * Do NOT strip module prefixes before `dashboard` — that incorrectly turned
 * facility/dashboard, fleet/dashboard, helpdesk/dashboard into bare `dashboard`.
 */

/** Role-like [role] URL segments accidentally pasted into Menu URL. */
function isAccidentalRolePrefix(segment: string): boolean {
  // camelCase role slugs: tenantAdmin, superAdmin, agencyUser, …
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(segment)) return true;
  if (/^(super)?admin$/i.test(segment)) return true;
  if (/^tenantadmin$/i.test(segment)) return true;
  return false;
}

export function normalizeMenuUrl(url: string): string {
  let value = url.trim().replace(/\\/g, "/");
  value = value.replace(/^https?:\/\/[^/]+/i, "");
  value = value.replace(/^\/+/, "").replace(/\/+$/, "");

  const parts = value.split("/").filter(Boolean);
  if (parts.length >= 2 && isAccidentalRolePrefix(parts[0]!)) {
    value = parts.slice(1).join("/");
  }

  return value.toLowerCase();
}
