import type { PropertyContractRate } from "@/types";

export interface ContractRateGroup {
  key: string;
  seasonPeriodId: number;
  seasonName: string;
  seasonCode?: string;
  fromDate?: string;
  toDate?: string;
  ratePlanTypeId?: number;
  ratePlanTypeName: string;
  ratePlanTypeCode?: string;
  entries: PropertyContractRate[];
  mealPlanLabels: string[];
  roomTypes: { id: number; name: string; code?: string }[];
  ratePlans: { id: number; label: string; code?: string; mealPlanCode?: string }[];
  occupancies: { id: number; code: string; short: string }[];
  activeCount: number;
  inactiveCount: number;
}

const OCCUPANCY_ORDER = ["SINGLE", "DOUBLE", "TRIPLE"] as const;

export function formatContractPeriodDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function occupancyShort(code: string) {
  const map: Record<string, string> = { SINGLE: "SGL", DOUBLE: "DBL", TRIPLE: "TPL" };
  return map[code.toUpperCase()] ?? code.slice(0, 3).toUpperCase();
}

function mealPlanHeading(code?: string, name?: string) {
  if (!code) return name ?? "Rate plan";
  const upper = code.toUpperCase();
  const labels: Record<string, string> = {
    RO: "ROOM ONLY (RO)",
    BB: "BED & BREAKFAST (BB)",
    HB: "HALF BOARD (HB)",
    FB: "FULL BOARD (FB)",
    AI: "ALL INCLUSIVE (AI)",
  };
  return labels[upper] ?? `${(name ?? code).toUpperCase()} (${upper})`;
}

export function groupContractRates(entries: PropertyContractRate[]): ContractRateGroup[] {
  const byKey = new Map<string, PropertyContractRate[]>();

  for (const entry of entries) {
    const key = `${entry.propertyContractSeasonPeriodId}-${entry.ratePlanTypeId ?? 0}`;
    const list = byKey.get(key) ?? [];
    list.push(entry);
    byKey.set(key, list);
  }

  const groups: ContractRateGroup[] = [];

  for (const [key, rows] of byKey) {
    const first = rows[0]!;
    const ratePlanIds = new Map<number, PropertyContractRate>();
    const roomIds = new Map<number, PropertyContractRate>();
    const occIds = new Map<number, PropertyContractRate>();

    for (const row of rows) {
      ratePlanIds.set(row.propertyContractRatePlanId, row);
      roomIds.set(row.propertyRoomId, row);
      occIds.set(row.occupancyTypeId, row);
    }

    const ratePlans = [...ratePlanIds.values()]
      .sort((a, b) => (a.mealPlanCode ?? a.ratePlanCode ?? "").localeCompare(b.mealPlanCode ?? b.ratePlanCode ?? ""))
      .map((r) => ({
        id: r.propertyContractRatePlanId,
        label: r.ratePlanName ?? r.ratePlanCode ?? "Rate plan",
        code: r.ratePlanCode,
        mealPlanCode: r.mealPlanCode,
      }));

    const roomTypes = [...roomIds.values()]
      .sort((a, b) => (a.roomName ?? "").localeCompare(b.roomName ?? ""))
      .map((r) => ({
        id: r.propertyRoomId,
        name: r.roomName ?? r.roomCode ?? "Room",
        code: r.roomCode,
      }));

    const occupancies = [...occIds.values()]
      .sort((a, b) => {
        const ai = OCCUPANCY_ORDER.indexOf(
          (a.occupancyTypeCode ?? "").toUpperCase() as (typeof OCCUPANCY_ORDER)[number]
        );
        const bi = OCCUPANCY_ORDER.indexOf(
          (b.occupancyTypeCode ?? "").toUpperCase() as (typeof OCCUPANCY_ORDER)[number]
        );
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map((r) => ({
        id: r.occupancyTypeId,
        code: r.occupancyTypeCode ?? "",
        short: occupancyShort(r.occupancyTypeCode ?? ""),
      }));

    groups.push({
      key,
      seasonPeriodId: first.propertyContractSeasonPeriodId,
      seasonName: first.seasonName ?? first.seasonCode ?? "Season",
      seasonCode: first.seasonCode,
      fromDate: first.fromDate,
      toDate: first.toDate,
      ratePlanTypeId: first.ratePlanTypeId,
      ratePlanTypeName: first.ratePlanTypeName ?? first.ratePlanTypeCode ?? "Rate plan",
      ratePlanTypeCode: first.ratePlanTypeCode,
      entries: rows,
      mealPlanLabels: ratePlans.map((p) => mealPlanHeading(p.mealPlanCode, p.label)),
      roomTypes,
      ratePlans,
      occupancies,
      activeCount: rows.filter((r) => r.isActive).length,
      inactiveCount: rows.filter((r) => !r.isActive).length,
    });
  }

  return groups.sort((a, b) => {
    const seasonCmp = (a.fromDate ?? "").localeCompare(b.fromDate ?? "");
    if (seasonCmp !== 0) return seasonCmp;
    return a.ratePlanTypeName.localeCompare(b.ratePlanTypeName);
  });
}

export function rateCellAmount(
  entries: PropertyContractRate[],
  ratePlanId: number,
  roomId: number,
  occupancyId: number
): number | null {
  const hit = entries.find(
    (e) =>
      e.propertyContractRatePlanId === ratePlanId &&
      e.propertyRoomId === roomId &&
      e.occupancyTypeId === occupancyId
  );
  return hit ? hit.rateAmount : null;
}

export function formatRateAmount(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
