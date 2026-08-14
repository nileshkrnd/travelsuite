import { prisma } from "@/lib/db";
import { listDayOfWeekRows, loadRateDayIdsByRate } from "@/lib/api/day-of-week-helpers";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const JS_DOW_TO_CODE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const PREFERRED_OCCUPANCY = ["DOUBLE", "SINGLE", "TRIPLE"] as const;

export type AriDayHint = {
  propertyRoomId: number;
  availabilityDate: string;
  contractRate: number | null;
  inventoryAllotment: number | null;
  contractInventoryStopSell: boolean;
  contractInventoryClosed: boolean;
};

function dayCodeForDate(iso: string): string {
  const dow = new Date(`${iso}T12:00:00`).getUTCDay();
  return JS_DOW_TO_CODE[dow] ?? "MON";
}

function pickRateAmount(
  rates: { occupancyTypeCode: string; rateAmount: number; dayIds: Set<number> }[],
  dayCode: string,
  dayIdByCode: Map<string, number>
): number | null {
  const dayId = dayIdByCode.get(dayCode);
  if (dayId == null) return null;

  const applicable = rates.filter((r) => r.dayIds.has(dayId));
  if (applicable.length === 0) return null;

  for (const code of PREFERRED_OCCUPANCY) {
    const match = applicable.find((r) => r.occupancyTypeCode.toUpperCase() === code);
    if (match) return match.rateAmount;
  }
  return Math.min(...applicable.map((r) => r.rateAmount));
}

/** Resolve contracted rate + inventory allotment per room/day for the calendar month. */
export async function buildAvailabilityAriHints(options: {
  tenantId: number;
  propertyId: number;
  days: string[];
  propertyRoomIds: number[];
}): Promise<{ hints: AriDayHint[]; currencyCode: string | null }> {
  const { tenantId, propertyId, days, propertyRoomIds } = options;
  if (days.length === 0 || propertyRoomIds.length === 0) return { hints: [], currencyCode: null };

  const monthStart = parseDateOnly(days[0]!);
  const monthEnd = parseDateOnly(days[days.length - 1]!);

  const contracts = await prisma.propertyContract.findMany({
    where: { tenantId, propertyId, isActive: true },
    include: { currency: { select: { currencyCode: true } } },
    orderBy: [{ propertyContractId: "desc" }],
  });
  if (contracts.length === 0) return { hints: [], currencyCode: null };

  const contractIds = contracts.map((c) => c.propertyContractId);
  const currencyCode = contracts[0]?.currency?.currencyCode ?? null;

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
    },
  });

  const periodIds = seasonPeriods.map((p) => p.propertyContractSeasonPeriodId);
  if (periodIds.length === 0) return { hints: [], currencyCode };

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
        occupancyType: { select: { occupancyTypeCode: true } },
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

  const ratesByPeriodRoom = new Map<string, { occupancyTypeCode: string; rateAmount: number; dayIds: Set<number> }[]>();
  for (const rate of rateRows) {
    const key = `${rate.propertyContractSeasonPeriodId}:${rate.propertyRoomId}`;
    const list = ratesByPeriodRoom.get(key) ?? [];
    list.push({
      occupancyTypeCode: rate.occupancyType.occupancyTypeCode,
      rateAmount: Number(rate.rateAmount.toString()),
      dayIds: new Set(rateDayMap.get(Number(rate.propertyContractRateId)) ?? []),
    });
    ratesByPeriodRoom.set(key, list);
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

      hints.push({
        propertyRoomId,
        availabilityDate,
        contractRate: pickRateAmount(rates, dayCode, dayIdByCode),
        inventoryAllotment: inv?.allotmentQty ?? null,
        contractInventoryStopSell: inv?.isStopSell ?? false,
        contractInventoryClosed: inv?.isClosed ?? false,
      });
    }
  }

  return { hints, currencyCode };
}
