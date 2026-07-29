import type { ModuleKey } from "@/config/permissions";

/** Accounting voucher kinds (Finance → Vouchers). */
export type VoucherKind =
  | "journal"
  | "sales"
  | "purchase"
  | "contra"
  | "receipt"
  | "payment"
  | "creditNote"
  | "debitNote";

export type VoucherStatus = "draft" | "posted" | "cancelled";

export interface VoucherLine {
  id: string;
  ledgerId: string;
  debit: number;
  credit: number;
  narration: string;
}

/**
 * Standard voucher header fields shared by every voucher kind.
 * Cost centre + department are optional dimensional tags for reporting.
 */
export interface Voucher {
  id: string;
  tenantId: string;
  kind: VoucherKind;
  voucherNo: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Party / primary ledger (customer, supplier, or contra “from”). */
  partyLedgerId: string | null;
  /** Cash/bank or income/expense ledger depending on kind. */
  accountLedgerId: string | null;
  /** Optional cost centre (mock master). */
  costCenterId: string | null;
  /** Optional department (finance mock master). */
  departmentId: string | null;
  narration: string;
  referenceNo: string;
  status: VoucherStatus;
  /** Document total (same as balanced line totals). */
  amount: number;
  lines: VoucherLine[];
  createdAt: string;
  updatedAt: string;
}

export type VoucherInput = Omit<Voucher, "id" | "tenantId" | "createdAt" | "updatedAt" | "lines" | "voucherNo"> & {
  voucherNo?: string;
  lines?: VoucherLine[];
};

export interface VoucherKindConfig {
  kind: VoucherKind;
  module: ModuleKey;
  title: string;
  description: string;
  prefix: string;
  pathSegment: string;
  /** Party / From field */
  partyLabel: string;
  partyGroupIds: string[];
  /** Account / To / Sales-Purchase field */
  accountLabel: string;
  accountGroupIds: string[];
  /** How lines are built on save — journal uses free multi-line entry */
  entryMode: "partyDrAccountCr" | "accountDrPartyCr" | "contra" | "journal";
}

export const VOUCHER_STATUSES: { value: VoucherStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "cancelled", label: "Cancelled" },
];

export const VOUCHER_KIND_CONFIGS: Record<VoucherKind, VoucherKindConfig> = {
  journal: {
    kind: "journal",
    module: "voucherJournal",
    title: "Journal Voucher",
    description: "General journal — multi-line debit and credit entries that must balance.",
    prefix: "JV",
    pathSegment: "journal",
    partyLabel: "Ledger",
    partyGroupIds: [],
    accountLabel: "Ledger",
    accountGroupIds: [],
    entryMode: "journal",
  },
  sales: {
    kind: "sales",
    module: "voucherSales",
    title: "Sales Voucher",
    description: "Record sales invoices — debit customer, credit sales ledger.",
    prefix: "SAL",
    pathSegment: "sales",
    partyLabel: "Customer (debtor)",
    partyGroupIds: ["ag_debtors"],
    accountLabel: "Sales ledger",
    accountGroupIds: ["ag_sales", "ag_direct_income"],
    entryMode: "partyDrAccountCr",
  },
  purchase: {
    kind: "purchase",
    module: "voucherPurchase",
    title: "Purchase Voucher",
    description: "Record purchases — debit purchase ledger, credit supplier.",
    prefix: "PUR",
    pathSegment: "purchase",
    partyLabel: "Supplier (creditor)",
    partyGroupIds: ["ag_creditors"],
    accountLabel: "Purchase ledger",
    accountGroupIds: ["ag_purchase"],
    entryMode: "accountDrPartyCr",
  },
  receipt: {
    kind: "receipt",
    module: "voucherReceipt",
    title: "Receipt Voucher",
    description: "Record money received — debit cash/bank, credit party.",
    prefix: "RCT",
    pathSegment: "receipt",
    partyLabel: "Received from",
    partyGroupIds: ["ag_debtors", "ag_creditors"],
    accountLabel: "Deposit to (cash/bank)",
    accountGroupIds: ["ag_cash", "ag_bank"],
    entryMode: "accountDrPartyCr",
  },
  payment: {
    kind: "payment",
    module: "voucherPayment",
    title: "Payment Voucher",
    description: "Record money paid — debit party/expense, credit cash/bank.",
    prefix: "PMT",
    pathSegment: "payment",
    partyLabel: "Paid to",
    partyGroupIds: ["ag_creditors", "ag_debtors", "ag_indirect_expense", "ag_purchase"],
    accountLabel: "Paid from (cash/bank)",
    accountGroupIds: ["ag_cash", "ag_bank"],
    entryMode: "partyDrAccountCr",
  },
  contra: {
    kind: "contra",
    module: "voucherContra",
    title: "Contra Voucher",
    description: "Transfer between cash and bank accounts.",
    prefix: "CTR",
    pathSegment: "contra",
    partyLabel: "From account",
    partyGroupIds: ["ag_cash", "ag_bank"],
    accountLabel: "To account",
    accountGroupIds: ["ag_cash", "ag_bank"],
    entryMode: "contra",
  },
  creditNote: {
    kind: "creditNote",
    module: "voucherCreditNote",
    title: "Credit Note",
    description: "Credit note to customer — debit sales, credit customer.",
    prefix: "CN",
    pathSegment: "credit-note",
    partyLabel: "Customer (debtor)",
    partyGroupIds: ["ag_debtors"],
    accountLabel: "Sales / income ledger",
    accountGroupIds: ["ag_sales", "ag_direct_income"],
    entryMode: "accountDrPartyCr",
  },
  debitNote: {
    kind: "debitNote",
    module: "voucherDebitNote",
    title: "Debit Note",
    description: "Debit note to supplier — debit supplier, credit purchase.",
    prefix: "DN",
    pathSegment: "debit-note",
    partyLabel: "Supplier (creditor)",
    partyGroupIds: ["ag_creditors"],
    accountLabel: "Purchase ledger",
    accountGroupIds: ["ag_purchase"],
    entryMode: "partyDrAccountCr",
  },
};

export function voucherStatusLabel(status: VoucherStatus): string {
  return VOUCHER_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function voucherKindLabel(kind: VoucherKind): string {
  return VOUCHER_KIND_CONFIGS[kind].title.replace(/ Voucher$/, "").replace(/ Note$/, " Note");
}
