import type { Company } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

/**
 * Companies belong to a tenant (holding). Regency Travel & Tours / MyHolidays /
 * Al Asmakh are companies under Regency Group Holding — not separate tenants.
 * `company_leisure` id is kept so existing users/branches keep working.
 */
export const companies: Company[] = [
  {
    id: "company_leisure",
    tenantId: DEFAULT_TENANT_ID,
    name: "Regency Travel & Tours",
    code: "regencyTravel",
    status: "active",
    createdAt: "2023-11-05T09:00:00.000Z",
  },
  {
    id: "company_myholidays",
    tenantId: DEFAULT_TENANT_ID,
    name: "MyHolidays",
    code: "myHolidays",
    status: "active",
    createdAt: "2024-03-12T09:00:00.000Z",
  },
  {
    id: "company_alasmakh",
    tenantId: DEFAULT_TENANT_ID,
    name: "Al Asmakh Real Estate",
    code: "alAsmakhRealEstate",
    status: "active",
    createdAt: "2024-04-01T09:00:00.000Z",
  },
  {
    id: "company_corporate",
    tenantId: DEFAULT_TENANT_ID,
    name: "Regency Corporate Travel",
    code: "regencyCorporate",
    status: "active",
    createdAt: "2024-01-15T09:00:00.000Z",
  },
];
