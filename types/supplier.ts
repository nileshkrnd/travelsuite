export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  supplierTypeId: string;
  status: SupplierStatus;
  createdAt: string;
}
