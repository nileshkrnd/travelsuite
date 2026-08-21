import type { ContentSectionType } from "@/types";

export class ContentSectionTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ContentSectionTypesApiError";
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

export async function listContentSectionTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<ContentSectionType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/content-section-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ContentSectionTypesApiError(await parseError(res), res.status);
  return res.json();
}

export async function createContentSectionType(input: {
  tenantId: number;
  companyId: number;
  sectionTypeCode: string;
  sectionTypeName: string;
  description?: string | null;
  isStepBased?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<ContentSectionType> {
  const res = await fetch("/api/content-section-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ContentSectionTypesApiError(await parseError(res), res.status);
  return res.json();
}
