/** Payment term lookup (Immediate, Net 15, Net 30, …). */
export interface PaymentTerm {
  paymentTermId: number;
  tenantId: number;
  companyId: number;
  paymentTermCode: string;
  paymentTermName: string;
  numberOfDays: number;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
