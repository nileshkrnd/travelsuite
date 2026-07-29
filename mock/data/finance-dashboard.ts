import { DEFAULT_TENANT_ID } from "./tenants";

/** Monthly P&L trend for Finance Dashboard (mock — not persisted vouchers). */
export interface FinanceMonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface FinanceVoucherRow {
  id: string;
  tenantId: string;
  date: string;
  voucherNo: string;
  type: "Sales" | "Purchase" | "Receipt" | "Payment" | "Contra" | "Credit Note" | "Debit Note";
  party: string;
  amount: number;
  status: "posted" | "draft";
}

export interface FinanceAgingBucket {
  label: string;
  amount: number;
}

export interface FinanceExpenseSlice {
  name: string;
  amount: number;
}

export const financeMonthlyTrend: FinanceMonthlyPoint[] = [
  { month: "Feb", income: 285000, expense: 198000 },
  { month: "Mar", income: 312000, expense: 215000 },
  { month: "Apr", income: 298000, expense: 221000 },
  { month: "May", income: 345000, expense: 238000 },
  { month: "Jun", income: 368000, expense: 252000 },
  { month: "Jul", income: 392000, expense: 266000 },
];

export const financeRecentVouchers: FinanceVoucherRow[] = [
  {
    id: "fv_1",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-24",
    voucherNo: "SAL-1042",
    type: "Sales",
    party: "Horizon Tours LLC",
    amount: 18500,
    status: "posted",
  },
  {
    id: "fv_2",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-23",
    voucherNo: "PUR-0881",
    type: "Purchase",
    party: "Emirates Airline",
    amount: 42000,
    status: "posted",
  },
  {
    id: "fv_3",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-23",
    voucherNo: "RCT-0512",
    type: "Receipt",
    party: "Pearl Corporate Travel",
    amount: 25000,
    status: "posted",
  },
  {
    id: "fv_4",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-22",
    voucherNo: "PMT-0334",
    type: "Payment",
    party: "Office Rent — Jul",
    amount: 20000,
    status: "posted",
  },
  {
    id: "fv_5",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-21",
    voucherNo: "SAL-1041",
    type: "Sales",
    party: "Pearl Corporate Travel",
    amount: 31200,
    status: "posted",
  },
  {
    id: "fv_6",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-20",
    voucherNo: "CN-0048",
    type: "Credit Note",
    party: "Horizon Tours LLC",
    amount: 1800,
    status: "draft",
  },
  {
    id: "fv_7",
    tenantId: DEFAULT_TENANT_ID,
    date: "2026-07-19",
    voucherNo: "CTR-0019",
    type: "Contra",
    party: "Cash → HDFC Bank",
    amount: 15000,
    status: "posted",
  },
];

export const financeReceivablesAging: FinanceAgingBucket[] = [
  { label: "Current", amount: 28500 },
  { label: "1–30 days", amount: 32000 },
  { label: "31–60 days", amount: 12000 },
  { label: "61–90 days", amount: 4500 },
  { label: "90+ days", amount: 1500 },
];

export const financeExpenseBreakdown: FinanceExpenseSlice[] = [
  { name: "Air purchases", amount: 980000 },
  { name: "Staff salaries", amount: 360000 },
  { name: "Office rent", amount: 120000 },
  { name: "Other admin", amount: 45000 },
];
