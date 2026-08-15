import type { PropertyReadiness } from "@/types";

export class PropertyReadinessApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyReadinessApiError";
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

export async function getPropertyReadiness(options: {
  propertyId: number;
  tenantId: number;
  companyId?: number;
  role: string;
}): Promise<PropertyReadiness> {
  const params = new URLSearchParams();
  params.set("propertyId", String(options.propertyId));
  params.set("tenantId", String(options.tenantId));
  if (options.companyId !== undefined) params.set("companyId", String(options.companyId));
  params.set("role", options.role);
  const res = await fetch(`/api/property-readiness?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyReadinessApiError(await parseError(res), res.status);
  return (await res.json()) as PropertyReadiness;
}
