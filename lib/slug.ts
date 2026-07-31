/**
 * Converts a free-text name into a camelCase, URL-safe slug — no spaces, hyphens,
 * or underscores. Used for role slugs, which become the `[role]` route segment.
 * "Super Admin" -> "superAdmin", "Sub-Agent" -> "subAgent", "DMC" -> "dmc".
 */
export function toCamelSlug(name: string): string {
  const words = name
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return "role";

  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Appends a numeric suffix if `base` already exists in `existingSlugs`
 * (case-insensitive). When `maxLength` is set, the stem is truncated so the
 * final value never exceeds that length.
 */
export function uniqueSlug(
  base: string,
  existingSlugs: string[],
  maxLength?: number
): string {
  const taken = new Set(existingSlugs.map((s) => s.toLowerCase()));
  const fit = (value: string) => (maxLength ? value.slice(0, maxLength) : value);

  let candidate = fit(base);
  if (!candidate) return candidate;
  if (!taken.has(candidate.toLowerCase())) return candidate;

  let i = 2;
  while (true) {
    const suffix = String(i);
    const room = maxLength != null ? maxLength - suffix.length : undefined;
    const stem = room != null ? base.slice(0, Math.max(1, room)) : base;
    candidate = `${stem}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    i += 1;
  }
}

/** CamelCase tenant code from name, unique against existing codes (max 30). */
export function generateTenantCode(name: string, existingCodes: string[]): string {
  if (!name.trim()) return "";
  const base = toCamelSlug(name);
  const stem = base === "role" ? "tenant" : base;
  return uniqueSlug(stem, existingCodes, 30);
}
