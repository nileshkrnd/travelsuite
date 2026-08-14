import type { PropertyRoomAvailability } from "@/types/property-room-availability";

export type PropertyRoomAvailabilityRow = {
  propertyRoomAvailabilityId: bigint;
  tenantId: number;
  companyId: number;
  propertyId: number;
  propertyRoomId: bigint;
  availabilityDate: Date;
  availableUnits: number;
  stopSell: boolean;
  minLengthOfStay: number | null;
  maxLengthOfStay: number | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date;
  modifiedBy: number | null;
  modifiedDtTm: Date | null;
  propertyRoom?: {
    roomCode: string;
    roomName: string;
  } | null;
};

function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function serializePropertyRoomAvailabilityRow(row: PropertyRoomAvailabilityRow) {
  return {
    propertyRoomAvailabilityId: Number(row.propertyRoomAvailabilityId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    propertyId: row.propertyId,
    propertyRoomId: Number(row.propertyRoomId),
    availabilityDate: formatDateOnly(row.availabilityDate),
    availableUnits: row.availableUnits,
    stopSell: row.stopSell,
    minLengthOfStay: row.minLengthOfStay,
    maxLengthOfStay: row.maxLengthOfStay,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: row.createdDtTm.toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm?.toISOString() ?? null,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
  };
}

export function toAppPropertyRoomAvailability(
  row: ReturnType<typeof serializePropertyRoomAvailabilityRow>
): PropertyRoomAvailability {
  return {
    id: String(row.propertyRoomAvailabilityId),
    propertyRoomAvailabilityKey: row.propertyRoomAvailabilityId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    availabilityDate: row.availabilityDate,
    availableUnits: row.availableUnits,
    stopSell: row.stopSell,
    minLengthOfStay: row.minLengthOfStay,
    maxLengthOfStay: row.maxLengthOfStay,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function parseDateOnly(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

export function monthDateRange(year: number, month: number): { start: Date; end: Date; days: string[] } {
  const start = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  const days: string[] = [];
  for (let d = 1; d <= end.getUTCDate(); d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(iso);
  }
  return { start, end, days };
}
