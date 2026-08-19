import type { BookingModel } from "@/types";

export interface BookingModelRow {
  bookingModelId: bigint | number;
  bookingModelCode: string;
  bookingModelName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppBookingModel(row: BookingModelRow): BookingModel {
  return {
    bookingModelId: Number(row.bookingModelId),
    bookingModelCode: row.bookingModelCode,
    bookingModelName: row.bookingModelName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
    companyName: row.companyName ?? undefined,
  };
}
