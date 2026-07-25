import { mockDelay } from "@/lib/utils";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";

/** Deterministic pseudo-random int in [min, max) — stable across reloads. */
function seededInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min));
}

export interface PerformanceRow {
  id: string;
  name: string;
  companyName?: string;
  actual: number;
  target: number;
  lastYear: number;
  bookings: number;
  attainmentPct: number;
  yoyGrowthPct: number;
}

export interface MonthlyPerformancePoint {
  month: string;
  actual: number;
  target: number;
  lastYear: number;
}

export interface TenantPerformanceSummary {
  actualRevenue: number;
  targetRevenue: number;
  lastYearRevenue: number;
  attainmentPct: number;
  yoyGrowthPct: number;
  companies: PerformanceRow[];
  branches: PerformanceRow[];
  monthly: MonthlyPerformancePoint[];
}

function rowMetrics(seed: string, name: string, id: string, companyName?: string): PerformanceRow {
  const actual = seededInt(`${seed}-actual`, 180_000, 1_450_000);
  const target = Math.round(actual * (0.85 + seededInt(`${seed}-tgt`, 0, 40) / 100));
  const lastYear = Math.round(actual * (0.72 + seededInt(`${seed}-ly`, 0, 45) / 100));
  const attainmentPct = target > 0 ? Math.round((actual / target) * 1000) / 10 : 0;
  const yoyGrowthPct =
    lastYear > 0 ? Math.round(((actual - lastYear) / lastYear) * 1000) / 10 : 0;

  return {
    id,
    name,
    companyName,
    actual,
    target,
    lastYear,
    bookings: seededInt(`${seed}-bk`, 42, 980),
    attainmentPct,
    yoyGrowthPct,
  };
}

function aggregate(rows: PerformanceRow[]): Omit<TenantPerformanceSummary, "companies" | "branches" | "monthly"> {
  const actualRevenue = rows.reduce((s, r) => s + r.actual, 0);
  const targetRevenue = rows.reduce((s, r) => s + r.target, 0);
  const lastYearRevenue = rows.reduce((s, r) => s + r.lastYear, 0);
  return {
    actualRevenue,
    targetRevenue,
    lastYearRevenue,
    attainmentPct: targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 1000) / 10 : 0,
    yoyGrowthPct:
      lastYearRevenue > 0
        ? Math.round(((actualRevenue - lastYearRevenue) / lastYearRevenue) * 1000) / 10
        : 0,
  };
}

/**
 * Tenant-wide company & branch performance for Tenant Admin dashboards.
 * Mock/seeded — replace with API in Phase 2.
 */
export async function getTenantPerformance(
  tenantId: string,
  opts?: { companyId?: string | null; branchId?: string | null }
): Promise<TenantPerformanceSummary> {
  await mockDelay();

  const companies = useCompaniesStore
    .getState()
    .companies.filter((c) => c.tenantId === tenantId && c.status === "active");
  const branches = useBranchesStore
    .getState()
    .branches.filter((b) => b.tenantId === tenantId && b.status === "active");

  let companyRows = companies.map((c) => rowMetrics(`${tenantId}:${c.id}`, c.name, c.id));
  if (opts?.companyId) {
    companyRows = companyRows.filter((r) => r.id === opts.companyId);
  }

  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
  let branchRows = branches
    .filter((b) => !opts?.companyId || b.companyId === opts.companyId)
    .filter((b) => !opts?.branchId || b.id === opts.branchId)
    .map((b) =>
      rowMetrics(`${tenantId}:${b.id}`, b.name, b.id, companyNameById.get(b.companyId) ?? "—")
    );

  // Prefer company totals as the headline when viewing the whole tenant;
  // fall back to branches if a company has no branch rows yet.
  const headlineRows = companyRows.length > 0 ? companyRows : branchRows;
  const totals = aggregate(headlineRows);

  const anchor = new Date("2026-07-01T00:00:00.000Z");
  const monthly: MonthlyPerformancePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(anchor);
    monthDate.setUTCMonth(monthDate.getUTCMonth() - i, 1);
    const label = monthDate.toLocaleString("en", { month: "short" });
    const seed = `${tenantId}:${opts?.companyId ?? "all"}:${opts?.branchId ?? "all"}:${label}`;
    const actual = seededInt(`${seed}-a`, 90_000, 420_000);
    const target = Math.round(actual * (0.9 + seededInt(`${seed}-t`, 0, 25) / 100));
    const lastYear = Math.round(actual * (0.75 + seededInt(`${seed}-y`, 0, 30) / 100));
    monthly.push({ month: label, actual, target, lastYear });
  }

  return {
    ...totals,
    companies: companyRows.sort((a, b) => b.actual - a.actual),
    branches: branchRows.sort((a, b) => b.actual - a.actual),
    monthly,
  };
}
