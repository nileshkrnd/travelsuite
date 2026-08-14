import { toAppOccupancyType, type OccupancyTypeRow } from "@/lib/mappers/occupancy-type.mapper";
import type { OccupancyType } from "@/types";

export class OccupancyTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "OccupancyTypesApiError";
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

export async function listOccupancyTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<OccupancyType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/occupancy-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new OccupancyTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as OccupancyTypeRow[]).map(toAppOccupancyType);
}

export async function createOccupancyType(input: {
  occupancyTypeCode: string;
  occupancyTypeName: string;
  description?: string | null;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<OccupancyType> {
  const res = await fetch("/api/occupancy-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new OccupancyTypesApiError(await parseError(res), res.status);
  return toAppOccupancyType(await res.json());
}
