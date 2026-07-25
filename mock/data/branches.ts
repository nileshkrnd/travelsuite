import type { Branch } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

/** Fallback cache until DB branches hydrate. branchKey ↔ BranchID. */
function base(
  partial: Pick<Branch, "id" | "branchKey" | "companyId" | "companyKey" | "name"> & Partial<Branch>
): Branch {
  return {
    tenantId: DEFAULT_TENANT_ID,
    tenantKey: 1,
    branchTypeId: 1,
    address1: "Address line 1",
    address2: "",
    countryId: 1,
    cityId: 1,
    zipCode: "00000",
    contactPerson: "Branch Manager",
    emailAddress: "branch@example.com",
    countryDialCode: "971",
    phoneNumber: "0000000",
    faxNumber: null,
    isActive: true,
    status: "active",
    createdBy: 1,
    createdAt: "2024-01-01T09:00:00.000Z",
    modifiedBy: null,
    modifiedDtTm: null,
    ...partial,
  };
}

export const branches: Branch[] = [
  base({
    id: "branch_mumbai",
    branchKey: 1,
    companyId: "company_leisure",
    companyKey: 1,
    name: "Mumbai",
    createdAt: "2023-11-10T09:00:00.000Z",
  }),
  base({
    id: "branch_dubai",
    branchKey: 2,
    companyId: "company_leisure",
    companyKey: 1,
    name: "Dubai",
    createdAt: "2024-02-01T09:00:00.000Z",
  }),
  base({
    id: "branch_london",
    branchKey: 3,
    companyId: "company_corporate",
    companyKey: 4,
    name: "London",
    createdAt: "2024-01-20T09:00:00.000Z",
  }),
];
