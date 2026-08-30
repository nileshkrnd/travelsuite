export const CONTACT_TYPE_CATEGORY_CODES = ["CUSTOMER", "SUPPLIER", "BOTH"] as const;

export type ContactTypeCategoryCode = (typeof CONTACT_TYPE_CATEGORY_CODES)[number];

export const CONTACT_TYPE_CATEGORY_OPTIONS: { value: ContactTypeCategoryCode; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "BOTH", label: "Both" },
];

export function contactTypeCategoryLabel(code: string | undefined): string {
  return CONTACT_TYPE_CATEGORY_OPTIONS.find((o) => o.value === code)?.label ?? code ?? "Both";
}

export function contactTypesForParty<T extends { contactTypeCategory?: string }>(
  rows: T[],
  party: "CUSTOMER" | "SUPPLIER"
): T[] {
  return rows.filter((row) => {
    const category = row.contactTypeCategory ?? "BOTH";
    return category === "BOTH" || category === party;
  });
}
