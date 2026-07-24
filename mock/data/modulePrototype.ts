import type { KpiFormat } from "@/config/dashboardWidgets";
import type { CurrencyCode, Money } from "@/types";

export interface ModulePrototypeKpi {
  label: string;
  icon: string;
  value: number | Money;
  format: KpiFormat;
}

export interface ModulePrototypeRow {
  id: string;
  reference: string;
  name: string;
  status: string;
  owner: string;
  amount: number | Money;
  updated: string;
}

export interface ModulePrototypeChartPoint {
  label: string;
  value: number;
}

export interface ModulePrototypeData {
  kpis: ModulePrototypeKpi[];
  rows: ModulePrototypeRow[];
  chart: ModulePrototypeChartPoint[];
  chartType: "bar" | "area";
  amountColumnLabel: string;
}

const STATUSES = ["Active", "Pending", "Confirmed", "Cancelled", "On Hold", "Draft", "Completed"] as const;

const OWNERS = [
  "Sarah Mitchell",
  "James Chen",
  "Priya Sharma",
  "Michael O'Brien",
  "Fatima Al-Rashid",
  "David Okonkwo",
  "Emma Laurent",
  "Raj Patel",
  "Sophie Becker",
  "Carlos Mendez",
];

const ENTITIES = [
  "Acme Travel Group",
  "Global Horizons Ltd",
  "Sunrise Tours",
  "Metro Business Travel",
  "Pacific Voyages",
  "Elite Corporate CBT",
  "Heritage Holidays",
  "Skyline Aviation Desk",
  "Coastal Resorts",
  "Urban Express Transfers",
];

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "AED"];

const KPI_TEMPLATES: { label: string; icon: string; format: KpiFormat; min: number; max: number }[] = [
  { label: "Total records", icon: "Layers", format: "number", min: 120, max: 4800 },
  { label: "This month", icon: "TrendingUp", format: "number", min: 18, max: 320 },
  { label: "Pending action", icon: "Hourglass", format: "number", min: 3, max: 48 },
  { label: "Total value", icon: "Wallet", format: "money", min: 12000, max: 890000 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function createSeededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function moneyValue(rand: () => number, min: number, max: number): Money {
  return {
    value: intBetween(rand, min, max),
    currencyCode: pick(rand, CURRENCIES),
  };
}

function formatReference(rand: () => number, moduleKey: string, index: number): string {
  const prefix = moduleKey.replace(/([A-Z])/g, "-$1").split("-").filter(Boolean).slice(0, 2).join("").slice(0, 4).toUpperCase() || "REF";
  const year = 2025 + Math.floor(rand() * 2);
  return `${prefix}-${year}-${String(index + 1).padStart(4, "0")}`;
}

function formatUpdated(rand: () => number): string {
  const daysAgo = intBetween(rand, 0, 45);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function getModulePrototypeData(moduleKey: string): ModulePrototypeData {
  const rand = createSeededRandom(moduleKey);
  const useMoney = rand() > 0.35;
  const amountColumnLabel = useMoney ? "Amount" : "Count";
  const chartType: "bar" | "area" = rand() > 0.5 ? "bar" : "area";
  const rowCount = 8 + Math.floor(rand() * 5);

  const kpis: ModulePrototypeKpi[] = KPI_TEMPLATES.map((template, i) => {
    const value =
      template.format === "money"
        ? moneyValue(rand, template.min, template.max)
        : intBetween(rand, template.min, template.max) + i * 7;

    return {
      label: template.label,
      icon: template.icon,
      format: template.format,
      value,
    };
  });

  const rows: ModulePrototypeRow[] = Array.from({ length: rowCount }, (_, i) => {
    const entity = pick(rand, ENTITIES);
    const suffix = pick(rand, ["Booking", "Request", "Record", "Entry", "Case", "Item"]);
    return {
      id: `${moduleKey}-${i}`,
      reference: formatReference(rand, moduleKey, i),
      name: `${entity} ${suffix}`,
      status: pick(rand, STATUSES),
      owner: pick(rand, OWNERS),
      amount: useMoney ? moneyValue(rand, 250, 18500) : intBetween(rand, 1, 120),
      updated: formatUpdated(rand),
    };
  });

  const chartStart = intBetween(rand, 0, 6);
  const chart: ModulePrototypeChartPoint[] = Array.from({ length: 6 }, (_, i) => ({
    label: MONTHS[(chartStart + i) % 12]!,
    value: intBetween(rand, 12, 180),
  }));

  return {
    kpis,
    rows,
    chart,
    chartType,
    amountColumnLabel,
  };
}
