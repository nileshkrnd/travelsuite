import { toAppCompany, type CompanyRow } from "@/lib/mappers/company.mapper";
import type { Company } from "@/types";

export class CompaniesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CompaniesApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

function mapRow(row: CompanyRow): Company {
  return toAppCompany(row);
}

export async function listCompanies(options?: {
  tenantId?: number;
  activeOnly?: boolean;
}): Promise<Company[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/companies${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CompaniesApiError(await parseError(res), res.status);
  return ((await res.json()) as CompanyRow[]).map(mapRow);
}

export interface CompanyWriteInput {
  companyUid?: string;
  companyGroupId?: number | null;
  companyCode: string;
  companyName: string;
  address1: string;
  address2?: string;
  countryId: number;
  cityId: number;
  currencyId: number;
  zipCode: string;
  countryDialCode: string;
  contactNumber?: string | null;
  fax?: string | null;
  contactPerson?: string | null;
  emailAddress?: string | null;
  isActive?: boolean;
  isRoundOff?: boolean;
  noOfSignificantDigits?: number;
  isDisplayNumberInThousands?: boolean | null;
  tenantId?: number;
  companyLogo?: string;
  companyFavIcon?: string;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createCompany(input: CompanyWriteInput & { tenantId: number; createdBy: number }): Promise<Company> {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CompaniesApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function updateCompany(companyId: number, input: CompanyWriteInput & { modifiedBy: number }): Promise<Company> {
  const res = await fetch(`/api/companies/${companyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CompaniesApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function setCompanyActive(
  companyId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Company> {
  const res = await fetch(`/api/companies/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new CompaniesApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}
