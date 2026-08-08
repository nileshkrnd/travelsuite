export interface PropertyFacilityOption {
  facilityId: number;
  facilityCode: string;
  facilityName: string;
  icon: string | null;
  categoryId: number;
  categoryName: string;
}

export class PropertyFacilitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyFacilitiesApiError";
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

export async function listPropertyFacilities(propertyId: number): Promise<PropertyFacilityOption[]> {
  const res = await fetch(`/api/property-facilities?propertyId=${propertyId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyFacilitiesApiError(await parseError(res), res.status);
  return res.json();
}

export async function savePropertyFacilities(
  propertyId: number,
  facilityIds: number[]
): Promise<PropertyFacilityOption[]> {
  const res = await fetch("/api/property-facilities", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, facilityIds }),
  });
  if (!res.ok) throw new PropertyFacilitiesApiError(await parseError(res), res.status);
  return res.json();
}
