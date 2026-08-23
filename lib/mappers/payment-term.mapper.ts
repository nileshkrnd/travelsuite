import type { PaymentTerm } from "@/types";

export interface PaymentTermRow {
  paymentTermId: bigint | number;
  tenantId: number;
  companyId: number;
  paymentTermCode: string;
  paymentTermName: string;
  numberOfDays: number;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPaymentTerm(row: PaymentTermRow): PaymentTerm {
  return {
    paymentTermId: Number(row.paymentTermId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    paymentTermCode: row.paymentTermCode,
    paymentTermName: row.paymentTermName,
    numberOfDays: row.numberOfDays,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
