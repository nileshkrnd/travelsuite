import type { Product } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const products: Product[] = [
  {
    id: "product_dxb_hotel",
    tenantId: DEFAULT_TENANT_ID,
    code: "HTL-DXB-001",
    name: "Grand Piazza Dubai Stay",
    country: "AE",
    city: "Dubai",
    supplierId: "supplier_grand_piazza",
    productType: "hotel",
    status: "active",
    createdAt: "2024-04-08T09:00:00.000Z",
  },
  {
    id: "product_dxb_transfer",
    tenantId: DEFAULT_TENANT_ID,
    code: "TRF-DXB-001",
    name: "DXB Airport Transfer",
    country: "AE",
    city: "Dubai",
    supplierId: "supplier_swift_transfers",
    productType: "transfer",
    status: "active",
    createdAt: "2024-04-12T09:00:00.000Z",
  },
  {
    id: "product_rom_flight",
    tenantId: DEFAULT_TENANT_ID,
    code: "FLT-ROM-001",
    name: "Rome City Break Flight Pack",
    country: "IT",
    city: "Rome",
    supplierId: "supplier_roma_dmc",
    productType: "flight",
    status: "active",
    createdAt: "2024-05-02T09:00:00.000Z",
  },
];
