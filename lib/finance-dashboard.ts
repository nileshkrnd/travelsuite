import { buildProfitAndLoss } from "@/lib/finance-reports";
import {
  financeExpenseBreakdown,
  financeMonthlyTrend,
  financeReceivablesAging,
  type FinanceAgingBucket,
  type FinanceExpenseSlice,
  type FinanceMonthlyPoint,
} from "@/mock/data/finance-dashboard";
import type { AccountGroup, Ledger, Voucher, VoucherKind } from "@/types";
import { voucherKindLabel } from "@/types";

export interface FinanceDashboardKpis {
  cashAndBank: number;
  receivables: number;
  payables: number;
  netProfit: number;
  grossProfit: number;
  totalIncome: number;
  totalExpenses: number;
  ledgerCount: number;
  groupCount: number;
}

export interface FinanceDashboardVoucherRow {
  id: string;
  date: string;
  voucherNo: string;
  type: string;
  party: string;
  amount: number;
  status: "posted" | "draft" | "cancelled";
}

export interface FinanceDashboardData {
  kpis: FinanceDashboardKpis;
  monthly: FinanceMonthlyPoint[];
  recentVouchers: FinanceDashboardVoucherRow[];
  receivablesAging: FinanceAgingBucket[];
  expenseBreakdown: FinanceExpenseSlice[];
}

const KIND_LABEL: Record<VoucherKind, string> = {
  journal: "Journal",
  sales: "Sales",
  purchase: "Purchase",
  contra: "Contra",
  receipt: "Receipt",
  payment: "Payment",
  creditNote: "Credit Note",
  debitNote: "Debit Note",
};

const CASH_BANK_GROUPS = new Set(["ag_cash", "ag_bank"]);
const DEBTOR_GROUPS = new Set(["ag_debtors"]);
const CREDITOR_GROUPS = new Set(["ag_creditors"]);

function sumByGroups(
  ledgers: Ledger[],
  groupIds: Set<string>,
  side: "debit" | "credit"
): number {
  return ledgers
    .filter(
      (l) =>
        l.status === "active" &&
        groupIds.has(l.groupId) &&
        l.openingBalanceType === side
    )
    .reduce((s, l) => s + l.openingBalance, 0);
}

export function buildFinanceDashboard(
  groups: AccountGroup[],
  ledgers: Ledger[],
  tenantId: string,
  vouchers: Voucher[] = []
): FinanceDashboardData {
  const tenantLedgers = ledgers.filter((l) => l.tenantId === tenantId);
  const tenantGroups = groups.filter((g) => g.tenantId === tenantId);
  const pl = buildProfitAndLoss(tenantGroups, tenantLedgers);
  const ledgerById = new Map(tenantLedgers.map((l) => [l.id, l]));

  const recentVouchers = vouchers
    .filter((v) => v.tenantId === tenantId)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((v) => ({
      id: v.id,
      date: v.date,
      voucherNo: v.voucherNo,
      type: KIND_LABEL[v.kind] ?? voucherKindLabel(v.kind),
      party: ledgerById.get(v.partyLedgerId ?? "")?.name ?? "—",
      amount: v.amount,
      status: v.status,
    }));

  return {
    kpis: {
      cashAndBank: sumByGroups(tenantLedgers, CASH_BANK_GROUPS, "debit"),
      receivables: sumByGroups(tenantLedgers, DEBTOR_GROUPS, "debit"),
      payables: sumByGroups(tenantLedgers, CREDITOR_GROUPS, "credit"),
      netProfit: pl.netProfit,
      grossProfit: pl.grossProfit,
      totalIncome: pl.totalIncome,
      totalExpenses: pl.totalExpenses,
      ledgerCount: tenantLedgers.filter((l) => l.status === "active").length,
      groupCount: tenantGroups.filter((g) => g.status === "active").length,
    },
    monthly: financeMonthlyTrend,
    recentVouchers,
    receivablesAging: financeReceivablesAging,
    expenseBreakdown: financeExpenseBreakdown,
  };
}
