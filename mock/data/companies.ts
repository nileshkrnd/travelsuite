import type { Company } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

/** Fallback cache until DB companies hydrate. companyKey ↔ CompanyID. */
function base(
  partial: Pick<Company, "id" | "companyKey" | "name" | "code"> & Partial<Company>
): Company {
  return {
    tenantId: DEFAULT_TENANT_ID,
    tenantKey: 1,
    companyGroupId: null,
    address1: "Address line 1",
    address2: "",
    countryId: 1,
    cityId: 1,
    currencyId: 1,
    zipCode: "00000",
    countryDialCode: "971",
    contactNumber: null,
    fax: null,
    contactPerson: null,
    emailAddress: null,
    isActive: true,
    status: "active",
    isRoundOff: false,
    noOfSignificantDigits: 2,
    isDisplayNumberInThousands: false,
    companyLogo: "",
    companyFavIcon: "",
    createdBy: 1,
    createdAt: "2024-01-01T09:00:00.000Z",
    modifiedBy: null,
    modifiedDtTm: null,
    ...partial,
  };
}

export const companies: Company[] = [
  base({
    id: "company_leisure",
    companyKey: 1,
    name: "Regency Travel & Tours",
    code: "regencyTravel",
    createdAt: "2023-11-05T09:00:00.000Z",
  }),
  base({
    id: "company_myholidays",
    companyKey: 2,
    name: "MyHolidays",
    code: "myHolidays",
    createdAt: "2024-03-12T09:00:00.000Z",
  }),
  base({
    id: "company_alasmakh",
    companyKey: 3,
    name: "Al Asmakh Real Estate",
    code: "alAsmakhRealEstate",
    createdAt: "2024-04-01T09:00:00.000Z",
  }),
  base({
    id: "company_corporate",
    companyKey: 4,
    name: "Regency Corporate Travel",
    code: "regencyCorporate",
    createdAt: "2024-01-15T09:00:00.000Z",
  }),
];
