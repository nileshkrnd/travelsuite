import type { PropertyRoomTypeView } from "@/types";

export interface PropertyRoomTypeViewRow {
  propertyRoomTypeViewId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyRoomId: bigint | number;
  viewTypeId: bigint | number;
  isPrimary: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  viewType?: { viewTypeCode: string; viewTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyRoomTypeView(row: PropertyRoomTypeViewRow): PropertyRoomTypeView {
  return {
    id: String(row.propertyRoomTypeViewId),
    propertyRoomTypeViewKey: Number(row.propertyRoomTypeViewId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyRoomId: Number(row.propertyRoomId),
    viewTypeId: Number(row.viewTypeId),
    viewTypeCode: row.viewType?.viewTypeCode,
    viewTypeName: row.viewType?.viewTypeName,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
