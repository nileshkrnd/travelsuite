import { prisma } from "@/lib/db";
import { listDayOfWeekRows } from "@/lib/api/day-of-week-helpers";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const JS_DOW_TO_CODE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export type ClosureDayHint = {
  propertyRoomId: number;
  availabilityDate: string;
  contractStopSale: boolean;
  contractBlackout: boolean;
};

type ClosureRecord = {
  fromDate: Date;
  toDate: Date;
  typeCode: string;
  propertyRoomId: number | null;
  dayOfWeekIds: number[];
};

function dayCodeForDate(iso: string): string {
  const dow = new Date(`${iso}T12:00:00`).getUTCDay();
  return JS_DOW_TO_CODE[dow] ?? "MON";
}

function appliesToRoomDay(
  record: ClosureRecord,
  propertyRoomId: number,
  availabilityDate: string,
  dayIdByCode: Map<string, number>
): boolean {
  const d = parseDateOnly(availabilityDate);
  if (d < record.fromDate || d > record.toDate) return false;

  if (record.dayOfWeekIds.length > 0) {
    const dayId = dayIdByCode.get(dayCodeForDate(availabilityDate));
    if (dayId == null || !record.dayOfWeekIds.includes(dayId)) return false;
  }

  const code = record.typeCode.toUpperCase();
  if (code === "PROPERTY" || code === "RATE_PLAN") return true;
  if (code === "ROOM_TYPE" || code === "ROOM_RATE_PLAN") {
    return record.propertyRoomId === propertyRoomId;
  }
  return false;
}

/** Resolve contract stop-sale and blackout flags per room/day for the calendar month. */
export async function buildAvailabilityClosureHints(options: {
  tenantId: number;
  propertyId: number;
  days: string[];
  propertyRoomIds: number[];
}): Promise<ClosureDayHint[]> {
  const { tenantId, propertyId, days, propertyRoomIds } = options;
  if (days.length === 0 || propertyRoomIds.length === 0) return [];

  const monthStart = parseDateOnly(days[0]!);
  const monthEnd = parseDateOnly(days[days.length - 1]!);

  const contracts = await prisma.propertyContract.findMany({
    where: { tenantId, propertyId, isActive: true },
    select: { propertyContractId: true },
  });
  if (contracts.length === 0) return [];

  const contractIds = contracts.map((c) => c.propertyContractId);

  const [stopSales, blackouts, daysOfWeek] = await Promise.all([
    prisma.propertyContractStopSale.findMany({
      where: {
        propertyContractId: { in: contractIds },
        isActive: true,
        fromDate: { lte: monthEnd },
        toDate: { gte: monthStart },
      },
      include: {
        stopSaleType: { select: { stopSaleTypeCode: true } },
        stopSaleDays: { where: { isActive: true }, select: { dayOfWeekId: true } },
      },
    }),
    prisma.propertyContractBlackout.findMany({
      where: {
        propertyContractId: { in: contractIds },
        isActive: true,
        fromDate: { lte: monthEnd },
        toDate: { gte: monthStart },
      },
      include: {
        blackoutType: { select: { blackoutTypeCode: true } },
        blackoutDays: { where: { isActive: true }, select: { dayOfWeekId: true } },
      },
    }),
    listDayOfWeekRows(true),
  ]);

  const dayIdByCode = new Map(daysOfWeek.map((d) => [d.dayOfWeekCode, d.dayOfWeekId]));

  const stopSaleRecords: ClosureRecord[] = stopSales.map((row) => ({
    fromDate: row.fromDate,
    toDate: row.toDate,
    typeCode: row.stopSaleType.stopSaleTypeCode,
    propertyRoomId: row.propertyRoomId != null ? Number(row.propertyRoomId) : null,
    dayOfWeekIds: row.stopSaleDays.map((d) => Number(d.dayOfWeekId)),
  }));

  const blackoutRecords: ClosureRecord[] = blackouts.map((row) => ({
    fromDate: row.fromDate,
    toDate: row.toDate,
    typeCode: row.blackoutType.blackoutTypeCode,
    propertyRoomId: row.propertyRoomId != null ? Number(row.propertyRoomId) : null,
    dayOfWeekIds: row.blackoutDays.map((d) => Number(d.dayOfWeekId)),
  }));

  const hints: ClosureDayHint[] = [];

  for (const propertyRoomId of propertyRoomIds) {
    for (const availabilityDate of days) {
      const contractStopSale = stopSaleRecords.some((r) =>
        appliesToRoomDay(r, propertyRoomId, availabilityDate, dayIdByCode)
      );
      const contractBlackout = blackoutRecords.some((r) =>
        appliesToRoomDay(r, propertyRoomId, availabilityDate, dayIdByCode)
      );

      if (contractStopSale || contractBlackout) {
        hints.push({ propertyRoomId, availabilityDate, contractStopSale, contractBlackout });
      }
    }
  }

  return hints;
}
