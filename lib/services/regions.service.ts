import type { Region, RegionStatus } from "@/types";

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
  regionCode: string;
  regionName: string;
  status?: string;
  createdBy: number;
  createdDtTm: string | Date;
  modifiedBy: number | null;
  modifiedDtTm: string | Date | null;
}): Region {
  return {
    regionId: row.regionId,
    regionCode: row.regionCode,
    regionName: row.regionName,
    status: (row.status === "inactive" ? "inactive" : "active") as RegionStatus,
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

export async function listRegions(options?: { activeOnly?: boolean }): Promise<Region[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/regions${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
  const data = (await res.json()) as Parameters<typeof toRegion>[0][];
  return data.map(toRegion);
}

export async function createRegion(input: {
  regionCode: string;
  regionName: string;
  status?: RegionStatus;
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
    regionCode: string;
    regionName: string;
    status?: RegionStatus;
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

export async function setRegionStatus(
  regionId: number,
  status: RegionStatus,
  modifiedBy: number
): Promise<Region> {
  const res = await fetch(`/api/regions/${regionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, modifiedBy }),
  });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
  return toRegion(await res.json());
}

export async function deleteRegion(regionId: number): Promise<void> {
  const res = await fetch(`/api/regions/${regionId}`, { method: "DELETE" });
  if (!res.ok) throw new RegionsApiError(await parseError(res), res.status);
}
