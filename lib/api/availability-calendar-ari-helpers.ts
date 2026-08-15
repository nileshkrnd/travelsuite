import { prisma } from "@/lib/db";
import { listDayOfWeekRows, loadRateDayIdsByRate } from "@/lib/api/day-of-week-helpers";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const JS_DOW_TO_CODE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const PREFERRED_OCCUPANCY = ["DOUBLE", "SINGLE", "TRIPLE"] as const;

export type AriOccupancyRate = {
  propertyContractRatePlanId: number;
  occupancyTypeId: number;
  rateAmount: number;
};

export type AriRatePlan = {
  propertyContractRatePlanId: number;
  propertyContractId: number;
  contractLabel: string | null;
  ratePlanCode: string;
  ratePlanName: string;
  mealPlanCode: string;
  mealPlanName: string;
  ratePlanTypeCode: string | null;
  ratePlanTypeName: string | null;
  displayOrder: number;
};

export type AriOccupancy = {
  occupancyTypeId: number;
  occupancyTypeCode: string;
  occupancyTypeName: string;
  displayOrder: number;
};

export type AriDayHint = {
  propertyRoomId: number;
  availabilityDate: string;
  contractRate: number | null;
  occupancyRates: AriOccupancyRate[];
  inventoryAllotment: number | null;
  contractInventoryStopSell: boolean;
  contractInventoryClosed: boolean;
  contractMinLengthOfStay: number | null;
  contractMaxLengthOfStay: number | null;
};

type PeriodRoomRate = {
  propertyContractRatePlanId: number;
  occupancyTypeId: number;
  occupancyTypeCode: string;
  rateAmount: number;
  dayIds: Set<number>;
};

function dayCodeForDate(iso: string): string {
  const dow = new Date(`${iso}T12:00:00`).getUTCDay();
  return JS_DOW_TO_CODE[dow] ?? "MON";
}

function appliesOnDay(dayIds: Set<number>, dayId: number | undefined): boolean {
  if (dayId == null) return false;
  if (dayIds.size === 0) return true;
  return dayIds.has(dayId);
}

function pickRateAmount(rates: PeriodRoomRate[], dayId: number | undefined): number | null {
  const applicable = rates.filter((r) => appliesOnDay(r.dayIds, dayId));
  if (applicable.length === 0) return null;

  for (const code of PREFERRED_OCCUPANCY) {
    const match = applicable.find((r) => r.occupancyTypeCode.toUpperCase() === code);
    if (match) return match.rateAmount;
  }
  return Math.min(...applicable.map((r) => r.rateAmount));
}

function occupancyRatesForDay(rates: PeriodRoomRate[], dayId: number | undefined): AriOccupancyRate[] {
  const out: AriOccupancyRate[] = [];
  for (const rate of rates) {
    if (!appliesOnDay(rate.dayIds, dayId)) continue;
    out.push({
      propertyContractRatePlanId: rate.propertyContractRatePlanId,
      occupancyTypeId: rate.occupancyTypeId,
      rateAmount: rate.rateAmount,
    });
  }
  return out;
}

/** Resolve contracted rate + inventory allotment per room/day for the calendar month. */
export async function buildAvailabilityAriHints(options: {
  tenantId: number;
  propertyId: number;
  days: string[];
  propertyRoomIds: number[];
}): Promise<{
  hints: AriDayHint[];
  currencyCode: string | null;
  ratePlans: AriRatePlan[];
  occupancies: AriOccupancy[];
}> {
  const { tenantId, propertyId, days, propertyRoomIds } = options;
  const empty = { hints: [] as AriDayHint[], currencyCode: null, ratePlans: [] as AriRatePlan[], occupancies: [] as AriOccupancy[] };
  if (days.length === 0 || propertyRoomIds.length === 0) return empty;

  const monthStart = parseDateOnly(days[0]!);
  const monthEnd = parseDateOnly(days[days.length - 1]!);

  const contracts = await prisma.propertyContract.findMany({
    where: { tenantId, propertyId, isActive: true },
    include: { currency: { select: { currencyCode: true } } },
    orderBy: [{ propertyContractId: "desc" }],
  });
  if (contracts.length === 0) return empty;

  const contractIds = contracts.map((c) => c.propertyContractId);
  const currencyCode = contracts[0]?.currency?.currencyCode ?? null;
  const contractLabelById = new Map(
    contracts.map((c) => [
      Number(c.propertyContractId),
      c.contractName || c.contractNumber || null,
    ])
  );

  const seasonPeriods = await prisma.propertyContractSeasonPeriod.findMany({
    where: {
      propertyContractId: { in: contractIds },
      isActive: true,
      fromDate: { lte: monthEnd },
      toDate: { gte: monthStart },
    },
    select: {
      propertyContractSeasonPeriodId: true,
      propertyContractId: true,
      fromDate: true,
      toDate: true,
      minLengthOfStay: true,
      maxLengthOfStay: true,
    },
  });

  const periodIds = seasonPeriods.map((p) => p.propertyContractSeasonPeriodId);
  if (periodIds.length === 0) return { ...empty, currencyCode };

  const [inventoryRows, rateRows, daysOfWeek] = await Promise.all([
    prisma.propertyContractInventory.findMany({
      where: {
        propertyContractId: { in: contractIds },
        propertyContractSeasonPeriodId: { in: periodIds },
        isActive: true,
      },
      select: {
        propertyContractSeasonPeriodId: true,
        propertyRoomId: true,
        allotmentQty: true,
        isStopSell: true,
        isClosed: true,
      },
    }),
    prisma.propertyContractRate.findMany({
      where: {
        propertyContractId: { in: contractIds },
        propertyContractSeasonPeriodId: { in: periodIds },
        isActive: true,
      },
      include: {
        occupancyType: {
          select: {
            occupancyTypeId: true,
            occupancyTypeCode: true,
            occupancyTypeName: true,
            displayOrder: true,
          },
        },
        ratePlan: {
          select: {
            propertyContractRatePlanId: true,
            propertyContractId: true,
            ratePlanCode: true,
            ratePlanName: true,
            displayOrder: true,
            mealPlan: { select: { mealPlanCode: true, mealPlanName: true } },
            ratePlanType: { select: { ratePlanTypeCode: true, ratePlanTypeName: true } },
          },
        },
      },
    }),
    listDayOfWeekRows(true),
  ]);

  const dayIdByCode = new Map(daysOfWeek.map((d) => [d.dayOfWeekCode, d.dayOfWeekId]));
  const rateDayMap = await loadRateDayIdsByRate(rateRows.map((r) => r.propertyContractRateId));

  const inventoryByPeriodRoom = new Map<string, (typeof inventoryRows)[0]>();
  for (const row of inventoryRows) {
    inventoryByPeriodRoom.set(`${row.propertyContractSeasonPeriodId}:${row.propertyRoomId}`, row);
  }

  const ratesByPeriodRoom = new Map<string, PeriodRoomRate[]>();
  const ratePlanMap = new Map<number, AriRatePlan>();
  const occupancyMap = new Map<number, AriOccupancy>();

  for (const rate of rateRows) {
    const key = `${rate.propertyContractSeasonPeriodId}:${rate.propertyRoomId}`;
    const list = ratesByPeriodRoom.get(key) ?? [];
    list.push({
      propertyContractRatePlanId: Number(rate.propertyContractRatePlanId),
      occupancyTypeId: Number(rate.occupancyTypeId),
      occupancyTypeCode: rate.occupancyType.occupancyTypeCode,
      rateAmount: Number(rate.rateAmount.toString()),
      dayIds: new Set(rateDayMap.get(Number(rate.propertyContractRateId)) ?? []),
    });
    ratesByPeriodRoom.set(key, list);

    const planId = Number(rate.ratePlan.propertyContractRatePlanId);
    if (!ratePlanMap.has(planId)) {
      const contractId = Number(rate.ratePlan.propertyContractId);
      ratePlanMap.set(planId, {
        propertyContractRatePlanId: planId,
        propertyContractId: contractId,
        contractLabel: contractLabelById.get(contractId) ?? null,
        ratePlanCode: rate.ratePlan.ratePlanCode,
        ratePlanName: rate.ratePlan.ratePlanName,
        mealPlanCode: rate.ratePlan.mealPlan.mealPlanCode,
        mealPlanName: rate.ratePlan.mealPlan.mealPlanName,
        ratePlanTypeCode: rate.ratePlan.ratePlanType?.ratePlanTypeCode ?? null,
        ratePlanTypeName: rate.ratePlan.ratePlanType?.ratePlanTypeName ?? null,
        displayOrder: rate.ratePlan.displayOrder,
      });
    }

    const occupancyId = Number(rate.occupancyType.occupancyTypeId);
    if (!occupancyMap.has(occupancyId)) {
      occupancyMap.set(occupancyId, {
        occupancyTypeId: occupancyId,
        occupancyTypeCode: rate.occupancyType.occupancyTypeCode,
        occupancyTypeName: rate.occupancyType.occupancyTypeName,
        displayOrder: rate.occupancyType.displayOrder,
      });
    }
  }

  function seasonForDate(iso: string) {
    const d = parseDateOnly(iso);
    return seasonPeriods.find((p) => d >= p.fromDate && d <= p.toDate);
  }

  const hints: AriDayHint[] = [];

  for (const propertyRoomId of propertyRoomIds) {
    for (const availabilityDate of days) {
      const period = seasonForDate(availabilityDate);
      if (!period) continue;

      const periodRoomKey = `${period.propertyContractSeasonPeriodId}:${propertyRoomId}`;
      const inv = inventoryByPeriodRoom.get(periodRoomKey);
      const rates = ratesByPeriodRoom.get(periodRoomKey) ?? [];
      const dayCode = dayCodeForDate(availabilityDate);
      const dayId = dayIdByCode.get(dayCode);

      hints.push({
        propertyRoomId,
        availabilityDate,
        contractRate: pickRateAmount(rates, dayId),
        occupancyRates: occupancyRatesForDay(rates, dayId),
        inventoryAllotment: inv?.allotmentQty ?? null,
        contractInventoryStopSell: inv?.isStopSell ?? false,
        contractInventoryClosed: inv?.isClosed ?? false,
        contractMinLengthOfStay: period.minLengthOfStay ?? null,
        contractMaxLengthOfStay: period.maxLengthOfStay ?? null,
      });
    }
  }

  const ratePlans = [...ratePlanMap.values()].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.ratePlanCode.localeCompare(b.ratePlanCode);
  });
  const occupancies = [...occupancyMap.values()].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.occupancyTypeCode.localeCompare(b.occupancyTypeCode);
  });

  return { hints, currencyCode, ratePlans, occupancies };
}
