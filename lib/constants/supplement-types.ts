/** Standard supplement type catalog — used for seeding and the contract supplement form. */
export type SupplementTypeCatalogEntry = {
  code: string;
  name: string;
  example: string;
  /** Hint for auto-selecting rate basis (matches RateBasisCode substring). */
  rateBasisHint: "PERSON" | "ROOM" | "NIGHT" | "STAY";
};

export const DEFAULT_SUPPLEMENT_TYPES: SupplementTypeCatalogEntry[] = [
  { code: "EXTRA_BED", name: "Extra Bed", example: "Adult extra bed", rateBasisHint: "PERSON" },
  { code: "CHILD", name: "Child Supplement", example: "Child 6–11 years", rateBasisHint: "PERSON" },
  { code: "MEAL", name: "Meal Supplement", example: "HB supplement", rateBasisHint: "PERSON" },
  { code: "GALA", name: "Gala Dinner", example: "New Year Gala", rateBasisHint: "PERSON" },
  { code: "ROOM", name: "Room Supplement", example: "Sea View supplement", rateBasisHint: "ROOM" },
  { code: "PERSON", name: "Person Supplement", example: "Additional person", rateBasisHint: "PERSON" },
  { code: "OTHER", name: "Other", example: "Miscellaneous", rateBasisHint: "STAY" },
];

export function supplementCodeFromType(typeCode: string, sequence = 1): string {
  const base = typeCode.replace(/_/g, "");
  return `${base}-${String(sequence).padStart(2, "0")}`;
}

export function findRateBasisIdForHint(
  rateBasisRows: { rateBasisId: number; rateBasisCode: string }[],
  hint: SupplementTypeCatalogEntry["rateBasisHint"]
): number {
  const match = rateBasisRows.find((b) =>
    b.rateBasisCode.toUpperCase().includes(hint)
  );
  return match?.rateBasisId ?? rateBasisRows[0]?.rateBasisId ?? 0;
}
