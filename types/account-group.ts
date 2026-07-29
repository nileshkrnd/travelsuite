/** Account Group nature — standard COA classification. */
export type AccountGroupNature = "assets" | "liabilities" | "equity" | "income" | "expenses";

/** Where the group appears in statutory reports. */
export type AccountGroupReportType = "balanceSheet" | "profitAndLoss";

/** Normal balance side for the group. */
export type AccountGroupNormalBalance = "debit" | "credit";

export type YesNo = "yes" | "no";

export type AccountGroupStatus = "active" | "inactive";

/**
 * Account Group master (mock-first).
 * Fields follow common ERP / Tally-style group setup for review before DB work.
 */
export interface AccountGroup {
  id: string;
  tenantId: string;
  /** Short code, e.g. CA, FA, SA. */
  code: string;
  name: string;
  /** Parent group id; null = primary / root group. */
  parentId: string | null;
  nature: AccountGroupNature;
  reportType: AccountGroupReportType;
  normalBalance: AccountGroupNormalBalance;
  /** Used in trading account / gross profit calculation. */
  affectsGrossProfit: YesNo;
  /** When yes, ledgers under this group behave like sub-ledgers. */
  behavesLikeSubLedger: YesNo;
  /** Nett debit/credit balances for reporting (vs separate Dr/Cr). */
  nettBalancesForReporting: YesNo;
  /** System-seeded primary groups cannot be deleted. */
  isSystem: boolean;
  status: AccountGroupStatus;
  createdAt: string;
}

export const ACCOUNT_GROUP_NATURES: { value: AccountGroupNature; label: string }[] = [
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "equity", label: "Equity / Capital" },
  { value: "income", label: "Income" },
  { value: "expenses", label: "Expenses" },
];

export const ACCOUNT_GROUP_REPORT_TYPES: { value: AccountGroupReportType; label: string }[] = [
  { value: "balanceSheet", label: "Balance Sheet" },
  { value: "profitAndLoss", label: "Profit and Loss" },
];

export const ACCOUNT_GROUP_NORMAL_BALANCES: { value: AccountGroupNormalBalance; label: string }[] = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];

export const YES_NO_OPTIONS: { value: YesNo; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function accountGroupNatureLabel(value: AccountGroupNature): string {
  return ACCOUNT_GROUP_NATURES.find((n) => n.value === value)?.label ?? value;
}

export function accountGroupReportLabel(value: AccountGroupReportType): string {
  return ACCOUNT_GROUP_REPORT_TYPES.find((n) => n.value === value)?.label ?? value;
}
