/** Standard cancellation policy type catalog — used for seeding and the contract form. */
export type CancellationPolicyTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_CANCELLATION_POLICY_TYPES: CancellationPolicyTypeCatalogEntry[] = [
  { code: "NO_PENALTY", name: "No Penalty" },
  { code: "NIGHTS", name: "Nights" },
  { code: "PERCENTAGE", name: "Percentage" },
  { code: "FULL_AMOUNT", name: "Full Amount" },
];

export function cancellationPolicyTypeNeedsPenaltyValue(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === "NIGHTS" || upper === "PERCENTAGE";
}
