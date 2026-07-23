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

/** Appends a numeric suffix if `base` already exists in `existingSlugs`. */
export function uniqueSlug(base: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base;
  let i = 2;
  while (existingSlugs.includes(`${base}${i}`)) i++;
  return `${base}${i}`;
}
