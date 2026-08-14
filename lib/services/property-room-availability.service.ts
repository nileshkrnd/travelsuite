import type {
  AvailabilityCalendarPayload,
  AvailabilityCalendarUpdate,
} from "@/types/property-room-availability";

export class PropertyRoomAvailabilityApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomAvailabilityApiError";
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

export async function getAvailabilityCalendar(options: {
  tenantId: number;
  propertyId: number;
  year: number;
  month: number;
}): Promise<AvailabilityCalendarPayload> {
  const params = new URLSearchParams({
    tenantId: String(options.tenantId),
    propertyId: String(options.propertyId),
    year: String(options.year),
    month: String(options.month),
  });
  const res = await fetch(`/api/property-room-availability/calendar?${params}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomAvailabilityApiError(await parseError(res), res.status);
  return (await res.json()) as AvailabilityCalendarPayload;
}

export async function saveAvailabilityCalendar(input: {
  tenantId: number;
  companyId: number;
  propertyId: number;
  createdBy: number;
  updates: AvailabilityCalendarUpdate[];
}): Promise<{ saved: number }> {
  const res = await fetch("/api/property-room-availability/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomAvailabilityApiError(await parseError(res), res.status);
  return (await res.json()) as { saved: number };
}
