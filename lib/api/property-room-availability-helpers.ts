import { prisma } from "@/lib/db";
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

  return {
    year,
    month,
    propertyId,
    rooms: rooms.map((r) => ({
      propertyRoomId: Number(r.propertyRoomId),
      roomCode: r.roomCode,
      roomName: r.roomName,
    })),
    cells: rows.map((row) => {
      const s = serializePropertyRoomAvailabilityRow(row);
      return {
        propertyRoomAvailabilityKey: s.propertyRoomAvailabilityId,
        propertyRoomId: s.propertyRoomId,
        availabilityDate: s.availabilityDate,
        availableUnits: s.availableUnits,
        stopSell: s.stopSell,
        minLengthOfStay: s.minLengthOfStay,
        maxLengthOfStay: s.maxLengthOfStay,
      };
    }),
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
          minLengthOfStay: update.minLengthOfStay ?? null,
          maxLengthOfStay: update.maxLengthOfStay ?? null,
          isActive: true,
          createdBy,
        },
        update: {
          availableUnits,
          stopSell,
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
