import { toAppIdentityDocumentCountry, type IdentityDocumentCountryRow } from "@/lib/mappers/identity-document-country.mapper";
import type { IdentityDocumentCountry } from "@/types";

export class IdentityDocumentCountriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "IdentityDocumentCountriesApiError";
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

export async function listIdentityDocumentCountries(options?: {
  identityDocumentTypeId?: number;
  countryId?: number;
  activeOnly?: boolean;
}): Promise<IdentityDocumentCountry[]> {
  const params = new URLSearchParams();
  if (options?.identityDocumentTypeId !== undefined) params.set("identityDocumentTypeId", String(options.identityDocumentTypeId));
  if (options?.countryId !== undefined) params.set("countryId", String(options.countryId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/identity-document-countries${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new IdentityDocumentCountriesApiError(await parseError(res), res.status);
  return ((await res.json()) as IdentityDocumentCountryRow[]).map(toAppIdentityDocumentCountry);
}
