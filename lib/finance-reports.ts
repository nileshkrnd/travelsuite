import type { AccountGroup, Ledger } from "@/types";

export interface TrialBalanceLine {
  id: string;
  code: string;
  name: string;
  groupName: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
}

export interface StatementLine {
  id: string;
  code: string;
  name: string;
  amount: number;
  kind: "group" | "ledger" | "total" | "subtotal";
  depth: number;
}

export interface BalanceSheetReport {
  assets: StatementLine[];
  liabilitiesAndEquity: StatementLine[];
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
}

export interface ProfitAndLossReport {
  income: StatementLine[];
  expenses: StatementLine[];
  totalIncome: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

function groupMap(groups: AccountGroup[]): Map<string, AccountGroup> {
  return new Map(groups.map((g) => [g.id, g]));
}

function collectGroupIds(rootId: string, groups: AccountGroup[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of groups) {
      if (g.parentId && ids.has(g.parentId) && !ids.has(g.id)) {
        ids.add(g.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function buildTrialBalance(groups: AccountGroup[], ledgers: Ledger[]): TrialBalanceReport {
  const byId = groupMap(groups);
  const active = ledgers.filter((l) => l.status === "active");

  const lines: TrialBalanceLine[] = active
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      groupName: byId.get(l.groupId)?.name ?? "—",
      debit: l.openingBalanceType === "debit" ? l.openingBalance : 0,
      credit: l.openingBalanceType === "credit" ? l.openingBalance : 0,
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;

  return {
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(difference) < 0.005,
    difference,
  };
}

/**
 * Sum ledgers under a root group.
 * `side` is the statement column (assets=debit, liabilities/equity=credit).
 * Opposite-side balances reduce the section total (e.g. Input VAT under Duties).
 */
function sumSection(
  root: AccountGroup,
  allGroups: AccountGroup[],
  ledgers: Ledger[],
  side: "debit" | "credit"
): { amount: number; lines: StatementLine[] } {
  const ids = collectGroupIds(root.id, allGroups);
  const rows = ledgers
    .filter((l) => l.status === "active" && ids.has(l.groupId) && l.openingBalance > 0)
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));

  let amount = 0;
  const lines: StatementLine[] = [];

  for (const l of rows) {
    const contrib = l.openingBalanceType === side ? l.openingBalance : -l.openingBalance;
    amount += contrib;
    lines.push({
      id: l.id,
      code: l.code,
      name: l.name,
      amount: contrib,
      kind: "ledger",
      depth: 1,
    });
  }

  return { amount, lines };
}

function buildSection(
  rootGroups: AccountGroup[],
  allGroups: AccountGroup[],
  ledgers: Ledger[],
  side: "debit" | "credit"
): { lines: StatementLine[]; total: number } {
  const lines: StatementLine[] = [];
  let total = 0;

  const roots = rootGroups
    .filter((g) => g.status === "active" && g.parentId === null)
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));

  for (const root of roots) {
    const { amount, lines: ledgerLines } = sumSection(root, allGroups, ledgers, side);
    if (ledgerLines.length === 0) continue;

    lines.push({
      id: root.id,
      code: root.code,
      name: root.name,
      amount,
      kind: "group",
      depth: 0,
    });
    lines.push(...ledgerLines);
    total += amount;
  }

  return { lines, total };
}

export function buildProfitAndLoss(groups: AccountGroup[], ledgers: Ledger[]): ProfitAndLossReport {
  const byId = groupMap(groups);
  const plLedgers = ledgers.filter((l) => {
    const g = byId.get(l.groupId);
    return l.status === "active" && g?.reportType === "profitAndLoss" && l.openingBalance > 0;
  });

  const incomeLedgers = plLedgers.filter((l) => l.openingBalanceType === "credit");
  const expenseLedgers = plLedgers.filter((l) => l.openingBalanceType === "debit");

  function linesFor(list: Ledger[]): StatementLine[] {
    return list
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        amount: l.openingBalance,
        kind: "ledger" as const,
        depth: 1,
      }));
  }

  const incomeRoots = groups.filter(
    (g) => g.status === "active" && g.parentId === null && g.nature === "income"
  );
  const expenseRoots = groups.filter(
    (g) => g.status === "active" && g.parentId === null && g.nature === "expenses"
  );

  const income: StatementLine[] = [];
  let totalIncome = 0;

  for (const root of incomeRoots.sort((a, b) => a.code.localeCompare(b.code))) {
    const ids = collectGroupIds(root.id, groups);
    const under = incomeLedgers.filter((l) => ids.has(l.groupId));
    const sum = under.reduce((s, l) => s + l.openingBalance, 0);
    if (sum === 0) continue;
    income.push({
      id: root.id,
      code: root.code,
      name: root.name,
      amount: sum,
      kind: "group",
      depth: 0,
    });
    income.push(...linesFor(under));
    totalIncome += sum;
  }

  const expenses: StatementLine[] = [];
  let totalExpenses = 0;

  for (const root of expenseRoots.sort((a, b) => a.code.localeCompare(b.code))) {
    const ids = collectGroupIds(root.id, groups);
    const under = expenseLedgers.filter((l) => ids.has(l.groupId));
    const sum = under.reduce((s, l) => s + l.openingBalance, 0);
    if (sum === 0) continue;
    expenses.push({
      id: root.id,
      code: root.code,
      name: root.name,
      amount: sum,
      kind: "group",
      depth: 0,
    });
    expenses.push(...linesFor(under));
    totalExpenses += sum;
  }

  const grossIncome = incomeLedgers
    .filter((l) => byId.get(l.groupId)?.affectsGrossProfit === "yes")
    .reduce((s, l) => s + l.openingBalance, 0);
  const grossExpenses = expenseLedgers
    .filter((l) => byId.get(l.groupId)?.affectsGrossProfit === "yes")
    .reduce((s, l) => s + l.openingBalance, 0);

  return {
    income: [
      ...income,
      {
        id: "total_income",
        code: "",
        name: "Total income",
        amount: totalIncome,
        kind: "total",
        depth: 0,
      },
    ],
    expenses: [
      ...expenses,
      {
        id: "total_expenses",
        code: "",
        name: "Total expenses",
        amount: totalExpenses,
        kind: "total",
        depth: 0,
      },
    ],
    totalIncome,
    totalExpenses,
    grossProfit: grossIncome - grossExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}

export function buildBalanceSheet(groups: AccountGroup[], ledgers: Ledger[]): BalanceSheetReport {
  const bsGroups = groups.filter((g) => g.reportType === "balanceSheet");

  const assetRoots = bsGroups.filter((g) => g.parentId === null && g.nature === "assets");
  const liabilityRoots = bsGroups.filter(
    (g) => g.parentId === null && (g.nature === "liabilities" || g.nature === "equity")
  );

  const assets = buildSection(assetRoots, groups, ledgers, "debit");
  const liabilitiesAndEquity = buildSection(liabilityRoots, groups, ledgers, "credit");

  const pl = buildProfitAndLoss(groups, ledgers);
  if (Math.abs(pl.netProfit) > 0.005) {
    liabilitiesAndEquity.lines.push({
      id: "pl_current",
      code: "P&L",
      name: pl.netProfit >= 0 ? "Current year profit" : "Current year loss",
      amount: pl.netProfit,
      kind: "subtotal",
      depth: 0,
    });
    liabilitiesAndEquity.total += pl.netProfit;
  }

  const totalAssets = assets.total;
  const totalLiabilitiesAndEquity = liabilitiesAndEquity.total;
  const difference = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;

  return {
    assets: [
      ...assets.lines,
      {
        id: "total_assets",
        code: "",
        name: "Total assets",
        amount: totalAssets,
        kind: "total",
        depth: 0,
      },
    ],
    liabilitiesAndEquity: [
      ...liabilitiesAndEquity.lines,
      {
        id: "total_le",
        code: "",
        name: "Total liabilities & equity",
        amount: totalLiabilitiesAndEquity,
        kind: "total",
        depth: 0,
      },
    ],
    totalAssets,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(difference) < 0.005,
    difference,
  };
}
