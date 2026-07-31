/** Pure menu URL normalizer — no imports from permissions/roles (avoids circular init). */
export function normalizeMenuUrl(url: string): string {
  let value = url.trim().replace(/\\/g, "/");
  value = value.replace(/^https?:\/\/[^/]+/i, "");
  value = value.replace(/^\/+/, "").replace(/\/+$/, "");

  const parts = value.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const knownRoots = new Set([
      "dashboard",
      "masters",
      "administration",
      "partners",
      "hrms",
      "sales",
      "book-offline",
      "book-online",
      "back-office",
      "mid-office",
      "extranet",
      "inventory",
      "procurement",
      "accounts",
      "assets",
      "crm",
      "b2b",
      "corporate",
      "reports",
      "settings",
      "agents",
      "billing",
      "bookings",
    ]);
    const first = parts[0]!.toLowerCase();
    const second = parts[1]!.toLowerCase();
    if (!knownRoots.has(first) && knownRoots.has(second)) {
      value = parts.slice(1).join("/");
    }
  }

  return value.toLowerCase();
}
