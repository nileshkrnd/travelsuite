import type { AdditionalInfoType, AdditionalInfoValueTypeCode } from "@/types";

export class AdditionalInfoTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdditionalInfoTypesApiError";
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

export async function listAdditionalInfoTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<AdditionalInfoType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/additional-info-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AdditionalInfoTypesApiError(await parseError(res), res.status);
  return res.json();
}

export async function createAdditionalInfoType(input: {
  tenantId: number;
  companyId: number;
  infoTypeCode: string;
  infoTypeName: string;
  description?: string | null;
  valueTypeCode: AdditionalInfoValueTypeCode;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<AdditionalInfoType> {
  const res = await fetch("/api/additional-info-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AdditionalInfoTypesApiError(await parseError(res), res.status);
  return res.json();
}
