import { prisma } from "@/lib/db";
import { buildAvailabilityAriHints } from "@/lib/api/availability-calendar-ari-helpers";
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

  const { hints, currencyCode } = await buildAvailabilityAriHints({
    tenantId,
    propertyId,
    days,
    propertyRoomIds: roomIds,
  });
  const ariByKey = new Map(hints.map((h) => [`${h.propertyRoomId}:${h.availabilityDate}`, h]));

  const availCells = [];
  for (const room of rooms) {
    const propertyRoomId = Number(room.propertyRoomId);
    for (const availabilityDate of days) {
      const key = `${propertyRoomId}:${availabilityDate}`;
      const saved = savedByKey.get(key);
      const ari = ariByKey.get(key);
      const contractAllotment = ari?.inventoryAllotment ?? null;
      const hasSavedAvail = saved != null;

      availCells.push({
        propertyRoomAvailabilityKey: saved?.propertyRoomAvailabilityId,
        propertyRoomId,
        availabilityDate,
        availableUnits: hasSavedAvail
          ? (saved.availableUnits ?? saved.dailyInventoryQty ?? null)
          : contractAllotment,
        stopSell: hasSavedAvail ? saved.stopSell : (ari?.contractInventoryStopSell ?? false),
        minLengthOfStay: saved?.minLengthOfStay ?? null,
        maxLengthOfStay: saved?.maxLengthOfStay ?? null,
        contractRate: ari?.contractRate ?? null,
        inventoryAllotment: contractAllotment,
        dailyRateAmount: saved?.dailyRateAmount ?? null,
        dailyInventoryQty: saved?.dailyInventoryQty ?? null,
        contractInventoryStopSell: ari?.contractInventoryStopSell ?? false,
        contractInventoryClosed: ari?.contractInventoryClosed ?? false,
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

  let saved = 0;
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      if (!validRoomSet.has(update.propertyRoomId)) continue;

      const availabilityDate = parseDateOnly(update.availabilityDate);
      const availableUnits = Math.max(0, Math.floor(update.availableUnits));
      const stopSell = update.stopSell ?? false;
      const dailyRateAmount =
        update.dailyRateAmount === undefined || update.dailyRateAmount === null
          ? null
          : update.dailyRateAmount;

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
          availableUnits,
          stopSell,
          dailyRateAmount,
          minLengthOfStay: update.minLengthOfStay ?? null,
          maxLengthOfStay: update.maxLengthOfStay ?? null,
          isActive: true,
          createdBy,
        },
        update: {
          availableUnits,
          stopSell,
          dailyRateAmount,
          dailyInventoryQty: null,
          minLengthOfStay: update.minLengthOfStay ?? null,
          maxLengthOfStay: update.maxLengthOfStay ?? null,
          modifiedBy: createdBy,
          modifiedDtTm: new Date(),
        },
      });
      saved += 1;
    }
  });

  return { saved };
}
