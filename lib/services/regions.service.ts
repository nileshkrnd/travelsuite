import type { Region } from "@/types";

export class RegionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RegionsApiError";
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

function toRegion(row: {
  regionId: number;
  tenantId: number;
  companyId: number;
  regionCode: string;
  regionName: string;
  createdBy: number;
  createdDtTm: string | Date;
  modifiedBy: number | null;
  modifiedDtTm: string | Date | null;
}): Region {
  return {
    regionId: row.regionId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    regionCode: row.regionCode,
    regionName: row.regionName,
    createdBy: row.createdBy,
    createdDtTm: typeof row.createdDtTm === "string" ? row.createdDtTm : row.createdDtTm.toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm:
      row.modifiedDtTm == null
        ? null
        : typeof row.modifiedDtTm === "string"
          ? row.modifiedDtTm
          : row.modifiedDtTm.toISOString(),
  };
}

export async function listRegions(tenantId: number, companyId: number): Promise<Region[]> {
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    companyId: String(companyId),
  });
  const res = await fetch(`/api/regions?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
  const data = (await res.json()) as Parameters<typeof toRegion>[0][];
  return data.map(toRegion);
}

export async function createRegion(input: {
  tenantId: number;
  companyId: number;
  regionCode: string;
  regionName: string;
  createdBy: number;
}): Promise<Region> {
  const res = await fetch("/api/regions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
  return toRegion(await res.json());
}

export async function updateRegion(
  regionId: number,
  input: {
    tenantId: number;
    companyId: number;
    regionCode: string;
    regionName: string;
    modifiedBy: number;
  }
): Promise<Region> {
  const res = await fetch(`/api/regions/${regionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
  return toRegion(await res.json());
}

export async function deleteRegion(
  regionId: number,
  tenantId: number,
  companyId: number
): Promise<void> {
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    companyId: String(companyId),
  });
  const res = await fetch(`/api/regions/${regionId}?${params.toString()}`, { method: "DELETE" });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
}
