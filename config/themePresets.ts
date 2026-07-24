export interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
}

/** Curated brand-color presets for Masters → Tenant. The first three match the seeded mock tenants, so nothing changes by default. */
export const THEME_PRESETS: ThemePreset[] = [
  { id: "classicBlue", name: "Classic Blue", primaryColor: "#2563EB" },
  { id: "tealCoast", name: "Teal Coast", primaryColor: "#0D9488" },
  { id: "sunsetOrange", name: "Sunset Orange", primaryColor: "#C2410C" },
  { id: "emerald", name: "Emerald", primaryColor: "#059669" },
  { id: "slateIndigo", name: "Slate Indigo", primaryColor: "#4F46E5" },
  { id: "crimson", name: "Crimson", primaryColor: "#DC2626" },
];
