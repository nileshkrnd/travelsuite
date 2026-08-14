/** Standard child policy type catalog — used for seeding and the contract child policy form. */
export type ChildPolicyTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_CHILD_POLICY_TYPES: ChildPolicyTypeCatalogEntry[] = [
  { code: "FREE", name: "Free" },
  { code: "SUPPLEMENT", name: "Supplement" },
  { code: "ADULT_RATE", name: "Adult Rate" },
  { code: "NOT_ALLOWED", name: "Not Allowed" },
];

export function childPolicyTypeNeedsRateValue(code: string): boolean {
  return code.toUpperCase() === "SUPPLEMENT";
}
