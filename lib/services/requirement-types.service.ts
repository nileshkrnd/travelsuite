import type { RequirementType } from "@/types";

export class RequirementTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RequirementTypesApiError";
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

export async function listRequirementTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<RequirementType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/requirement-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RequirementTypesApiError(await parseError(res), res.status);
  return res.json();
}

export async function createRequirementType(input: {
  tenantId: number;
  companyId: number;
  requirementTypeCode: string;
  requirementTypeName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<RequirementType> {
  const res = await fetch("/api/requirement-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RequirementTypesApiError(await parseError(res), res.status);
  return res.json();
}
