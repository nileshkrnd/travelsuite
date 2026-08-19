import { toAppBookingModel, type BookingModelRow } from "@/lib/mappers/booking-model.mapper";
import type { BookingModel } from "@/types";

export class BookingModelsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BookingModelsApiError";
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

export async function listBookingModels(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BookingModel[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/booking-models${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BookingModelsApiError(await parseError(res), res.status);
  return ((await res.json()) as BookingModelRow[]).map(toAppBookingModel);
}

export async function createBookingModel(input: {
  bookingModelCode: string;
  bookingModelName: string;
  description?: string;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BookingModel> {
  const res = await fetch("/api/booking-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BookingModelsApiError(await parseError(res), res.status);
  return toAppBookingModel(await res.json());
}

export async function updateBookingModel(
  bookingModelId: number,
  input: {
    bookingModelCode: string;
    bookingModelName: string;
    description?: string;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<BookingModel> {
  const res = await fetch(`/api/booking-models/${bookingModelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BookingModelsApiError(await parseError(res), res.status);
  return toAppBookingModel(await res.json());
}

export async function setBookingModelActive(
  bookingModelId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<BookingModel> {
  const res = await fetch(`/api/booking-models/${bookingModelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new BookingModelsApiError(await parseError(res), res.status);
  return toAppBookingModel(await res.json());
}

export async function deleteBookingModel(bookingModelId: number): Promise<void> {
  const res = await fetch(`/api/booking-models/${bookingModelId}`, { method: "DELETE" });
  if (!res.ok) throw new BookingModelsApiError(await parseError(res), res.status);
}
