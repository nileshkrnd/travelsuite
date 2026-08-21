import type {
  ServiceProductContentSection,
  ServiceProductContentSectionItem,
  ServiceProductContentSectionItemPoint,
} from "@/types";

export interface ServiceProductContentSectionItemPointRow {
  serviceProductContentSectionItemPointId: bigint | number;
  pointText: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ServiceProductContentSectionItemRow {
  serviceProductContentSectionItemId: bigint | number;
  itemTitle: string;
  itemDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  points?: ServiceProductContentSectionItemPointRow[];
}

export interface ServiceProductContentSectionRow {
  serviceProductContentSectionId: bigint | number;
  serviceProductId: bigint | number;
  contentSectionTypeId: bigint | number;
  sectionTitle: string;
  sectionDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  contentSectionType?: { sectionTypeCode: string; sectionTypeName: string; isStepBased: boolean } | null;
  items?: ServiceProductContentSectionItemRow[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toAppPoint(row: ServiceProductContentSectionItemPointRow): ServiceProductContentSectionItemPoint {
  return {
    serviceProductContentSectionItemPointId: Number(row.serviceProductContentSectionItemPointId),
    pointText: row.pointText,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

function toAppItem(row: ServiceProductContentSectionItemRow): ServiceProductContentSectionItem {
  return {
    serviceProductContentSectionItemId: Number(row.serviceProductContentSectionItemId),
    itemTitle: row.itemTitle,
    itemDescription: row.itemDescription,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    points: (row.points ?? []).map(toAppPoint),
  };
}

export function toAppServiceProductContentSection(row: ServiceProductContentSectionRow): ServiceProductContentSection {
  return {
    serviceProductContentSectionId: Number(row.serviceProductContentSectionId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    contentSectionTypeId: Number(row.contentSectionTypeId),
    sectionTypeCode: row.contentSectionType?.sectionTypeCode ?? undefined,
    sectionTypeName: row.contentSectionType?.sectionTypeName ?? undefined,
    isStepBased: row.contentSectionType?.isStepBased ?? undefined,
    sectionTitle: row.sectionTitle,
    sectionDescription: row.sectionDescription,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    items: (row.items ?? []).map(toAppItem),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
