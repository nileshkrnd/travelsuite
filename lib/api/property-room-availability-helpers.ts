import { prisma } from "@/lib/db";
import { buildAvailabilityAriHints } from "@/lib/api/availability-calendar-ari-helpers";
import { buildAvailabilityClosureHints } from "@/lib/api/availability-calendar-closure-helpers";
import {
  monthDateRange,
  parseDateOnly,
  serializePropertyRoomAvailabilityRow,
  type PropertyRoomAvailabilityRow,
} from "@/lib/mappers/property-room-availability.mapper";
import type { AvailabilityCalendarPayload, AvailabilityCalendarUpdate } from "@/types/property-room-availability";

export const propertyRoomAvailabilityInclude = {
  propertyRoom: { select: { roomCode: true, roomName: true } },
} as const;

export async function loadAvailabilityCalendar(options: {
  tenantId: number;
  propertyId: number;
  year: number;
  month: number;
}): Promise<AvailabilityCalendarPayload> {
  const { tenantId, propertyId, year, month } = options;
  const { start, end, days } = monthDateRange(year, month);

  const rooms = await prisma.propertyRoom.findMany({
    where: { tenantId, propertyId, isActive: true },
    select: { propertyRoomId: true, roomCode: true, roomName: true },
    orderBy: [{ displayOrder: "asc" }, { roomName: "asc" }],
  });

  const roomIds = rooms.map((r) => Number(r.propertyRoomId));

  const rows = (await prisma.propertyRoomAvailability.findMany({
    where: {
      tenantId,
      propertyId,
      availabilityDate: { gte: start, lte: end },
      isActive: true,
    },
    include: propertyRoomAvailabilityInclude,
    orderBy: [{ availabilityDate: "asc" }, { propertyRoomId: "asc" }],
  })) as PropertyRoomAvailabilityRow[];

  const savedByKey = new Map(
    rows.map((row) => {
      const s = serializePropertyRoomAvailabilityRow(row);
      return [`${s.propertyRoomId}:${s.availabilityDate}`, s] as const;
    })
  );

  const [{ hints, currencyCode, ratePlans, occupancies }, closureHints] = await Promise.all([
    buildAvailabilityAriHints({
      tenantId,
      propertyId,
      days,
      propertyRoomIds: roomIds,
    }),
    buildAvailabilityClosureHints({
      tenantId,
      propertyId,
      days,
      propertyRoomIds: roomIds,
    }),
  ]);
  const ariByKey = new Map(hints.map((h) => [`${h.propertyRoomId}:${h.availabilityDate}`, h]));
  const closureByKey = new Map(
    closureHints.map((h) => [`${h.propertyRoomId}:${h.availabilityDate}`, h])
  );

  const availCells = [];
  for (const room of rooms) {
    const propertyRoomId = Number(room.propertyRoomId);
    for (const availabilityDate of days) {
      const key = `${propertyRoomId}:${availabilityDate}`;
      const saved = savedByKey.get(key);
      const ari = ariByKey.get(key);
      const closure = closureByKey.get(key);
      const contractAllotment = ari?.inventoryAllotment ?? null;
      const hasSavedAvail = saved != null;
      const contractStopSale = closure?.contractStopSale ?? false;
      const contractBlackout = closure?.contractBlackout ?? false;

      availCells.push({
        propertyRoomAvailabilityKey: saved?.propertyRoomAvailabilityId,
        propertyRoomId,
        availabilityDate,
        availableUnits: hasSavedAvail
          ? (saved.availableUnits ?? saved.dailyInventoryQty ?? null)
          : contractAllotment,
        stopSell: hasSavedAvail ? saved.stopSell : (ari?.contractInventoryStopSell ?? false),
        closedToArrival: saved?.closedToArrival ?? false,
        closedToDeparture: saved?.closedToDeparture ?? false,
        minLengthOfStay: saved?.minLengthOfStay ?? null,
        maxLengthOfStay: saved?.maxLengthOfStay ?? null,
        contractRate: ari?.contractRate ?? null,
        occupancyRates: ari?.occupancyRates ?? [],
        inventoryAllotment: contractAllotment,
        dailyRateAmount: saved?.dailyRateAmount ?? null,
        dailyInventoryQty: saved?.dailyInventoryQty ?? null,
        contractInventoryStopSell: ari?.contractInventoryStopSell ?? false,
        contractInventoryClosed: ari?.contractInventoryClosed ?? false,
        contractStopSale,
        contractBlackout,
      });
    }
  }

  return {
    year,
    month,
    propertyId,
    currencyCode,
    rooms: rooms.map((r) => ({
      propertyRoomId: Number(r.propertyRoomId),
      roomCode: r.roomCode,
      roomName: r.roomName,
    })),
    ratePlans,
    occupancies,
    cells: availCells,
    days,
  };
}

export async function saveAvailabilityCalendarUpdates(input: {
  tenantId: number;
  companyId: number;
  propertyId: number;
  createdBy: number;
  updates: AvailabilityCalendarUpdate[];
}) {
  const { tenantId, companyId, propertyId, createdBy, updates } = input;
  if (updates.length === 0) return { saved: 0 };

  const roomIds = [...new Set(updates.map((u) => BigInt(u.propertyRoomId)))];
  const validRooms = await prisma.propertyRoom.findMany({
    where: { tenantId, propertyId, propertyRoomId: { in: roomIds }, isActive: true },
    select: { propertyRoomId: true },
  });
  const validRoomSet = new Set(validRooms.map((r) => Number(r.propertyRoomId)));

  const allotmentFallback = new Map<string, number>();
  const needsAllotmentFallback = updates.some((u) => u.availableUnits == null && validRoomSet.has(u.propertyRoomId));
  if (needsAllotmentFallback) {
    const days = [...new Set(updates.map((u) => u.availabilityDate))];
    const { hints } = await buildAvailabilityAriHints({
      tenantId,
      propertyId,
      days,
      propertyRoomIds: [...validRoomSet],
    });
    for (const hint of hints) {
      if (hint.inventoryAllotment != null) {
        allotmentFallback.set(`${hint.propertyRoomId}:${hint.availabilityDate}`, hint.inventoryAllotment);
      }
    }
  }

  let saved = 0;
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      if (!validRoomSet.has(update.propertyRoomId)) continue;

      const availabilityDate = parseDateOnly(update.availabilityDate);
      const availableUnits =
        update.availableUnits != null ? Math.max(0, Math.floor(update.availableUnits)) : undefined;

      await tx.propertyRoomAvailability.upsert({
        where: {
          tenantId_propertyRoomId_availabilityDate: {
            tenantId,
            propertyRoomId: BigInt(update.propertyRoomId),
            availabilityDate,
          },
        },
        create: {
          tenantId,
          companyId,
          propertyId,
          propertyRoomId: BigInt(update.propertyRoomId),
          availabilityDate,
          availableUnits:
            availableUnits ??
            allotmentFallback.get(`${update.propertyRoomId}:${update.availabilityDate}`) ??
            0,
          stopSell: update.stopSell ?? false,
          closedToArrival: update.closedToArrival ?? false,
          closedToDeparture: update.closedToDeparture ?? false,
          dailyRateAmount:
            update.dailyRateAmount === undefined || update.dailyRateAmount === null
              ? null
              : update.dailyRateAmount,
          minLengthOfStay: update.minLengthOfStay ?? null,
          maxLengthOfStay: update.maxLengthOfStay ?? null,
          isActive: true,
          createdBy,
        },
        update: {
          ...(availableUnits != null
            ? { availableUnits, dailyInventoryQty: null }
            : {}),
          ...(update.stopSell !== undefined ? { stopSell: update.stopSell } : {}),
          ...(update.closedToArrival !== undefined
            ? { closedToArrival: update.closedToArrival }
            : {}),
          ...(update.closedToDeparture !== undefined
            ? { closedToDeparture: update.closedToDeparture }
            : {}),
          ...(update.dailyRateAmount !== undefined
            ? { dailyRateAmount: update.dailyRateAmount }
            : {}),
          ...(update.minLengthOfStay !== undefined
            ? { minLengthOfStay: update.minLengthOfStay }
            : {}),
          ...(update.maxLengthOfStay !== undefined
            ? { maxLengthOfStay: update.maxLengthOfStay }
            : {}),
          modifiedBy: createdBy,
          modifiedDtTm: new Date(),
        },
      });
      saved += 1;
    }
  });

  return { saved };
}
