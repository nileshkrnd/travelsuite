import type { YesNo } from "./account-group";

/** Debit / Credit for opening balance. */
export type LedgerBalanceSide = "debit" | "credit";

export type LedgerStatus = "active" | "inactive";

/**
 * Ledger master (mock-first).
 * Fields follow common ERP / Tally-style ledger setup for review before DB work.
 */
export interface Ledger {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  /** Account Group this ledger sits under. */
  groupId: string;
  openingBalance: number;
  openingBalanceType: LedgerBalanceSide;
  /** Maintain bill-by-bill balances (parties / advances). */
  billByBill: YesNo;
  /** Inventory values are affected (stock items). */
  inventoryValuesAffected: YesNo;
  /** Cost centres / profit centres applicable. */
  costCentresApplicable: YesNo;
  /** Optional credit period in days (for party ledgers). */
  creditPeriodDays: number | null;
  /** Optional credit limit amount. */
  creditLimit: number | null;
  /** Mailing / contact name (optional display). */
  mailingName: string;
  status: LedgerStatus;
  /** System cash/bank style seeds cannot be deleted. */
  isSystem: boolean;
  createdAt: string;
}

export const LEDGER_BALANCE_SIDES: { value: LedgerBalanceSide; label: string }[] = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];

export function ledgerBalanceSideLabel(value: LedgerBalanceSide): string {
  return LEDGER_BALANCE_SIDES.find((s) => s.value === value)?.label ?? value;
}
