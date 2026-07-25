export type ProductStatus = "active" | "inactive";

/** Seeded product types for the Product Master dropdown. */
export type ProductTypeCode = "flight" | "hotel" | "transfer" | "rentACar";

export interface ProductTypeOption {
  code: ProductTypeCode;
  name: string;
}

export const PRODUCT_TYPES: ProductTypeOption[] = [
  { code: "flight", name: "Flight" },
  { code: "hotel", name: "Hotel" },
  { code: "transfer", name: "Transfer" },
  { code: "rentACar", name: "Rent a car" },
];

export function getProductTypeName(code: ProductTypeCode): string {
  return PRODUCT_TYPES.find((t) => t.code === code)?.name ?? code;
}

export interface Product {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  country: string;
  city: string;
  supplierId: string;
  productType: ProductTypeCode;
  status: ProductStatus;
  createdAt: string;
}
