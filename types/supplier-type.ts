/** Supplier Type lookup — global (DMC, Hotelier, Tour Operator, Transport, Activity Provider, …). */
export interface SupplierTypeMaster {
  id: string;
  typeKey: number;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
