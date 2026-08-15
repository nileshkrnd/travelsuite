import type { PropertySetupNote } from "@/types";

export interface PropertySetupNoteRow {
  propertySetupNoteId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyId: number;
  stepCode: string | null;
  note: string;
  priority: string;
  createdBy: number;
  createdDtTm: Date | string;
}

export function toAppPropertySetupNote(row: PropertySetupNoteRow, createdByName: string): PropertySetupNote {
  return {
    id: String(row.propertySetupNoteId),
    propertySetupNoteKey: Number(row.propertySetupNoteId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    stepCode: row.stepCode,
    note: row.note,
    priority: (row.priority as PropertySetupNote["priority"]) || "normal",
    createdBy: row.createdBy,
    createdByName,
    createdAt: typeof row.createdDtTm === "string" ? row.createdDtTm : row.createdDtTm.toISOString(),
  };
}
