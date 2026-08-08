export interface PropertyAmenityOption {
  amenityId: number;
  amenityCode: string;
  amenityName: string;
  icon: string | null;
  categoryId: number;
  categoryName: string;
}

export class PropertyAmenitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyAmenitiesApiError";
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

export async function listPropertyAmenities(propertyId: number): Promise<PropertyAmenityOption[]> {
  const res = await fetch(`/api/property-amenities?propertyId=${propertyId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyAmenitiesApiError(await parseError(res), res.status);
  return res.json();
}

export async function savePropertyAmenities(
  propertyId: number,
  amenityIds: number[]
): Promise<PropertyAmenityOption[]> {
  const res = await fetch("/api/property-amenities", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, amenityIds }),
  });
  if (!res.ok) throw new PropertyAmenitiesApiError(await parseError(res), res.status);
  return res.json();
}
