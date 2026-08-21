import type { BookingQuestionType, BookingQuestionRequirement, BookingQuestionOperator } from "@/types";

export class BookingQuestionLookupsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BookingQuestionLookupsApiError";
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

function buildQuery(options?: { tenantId?: number; companyId?: number; activeOnly?: boolean }): string {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listBookingQuestionTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BookingQuestionType[]> {
  const res = await fetch(`/api/booking-question-types${buildQuery(options)}`, { cache: "no-store" });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}

export async function createBookingQuestionType(input: {
  tenantId: number;
  companyId: number;
  questionTypeCode: string;
  questionTypeName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BookingQuestionType> {
  const res = await fetch("/api/booking-question-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}

export async function listBookingQuestionRequirements(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BookingQuestionRequirement[]> {
  const res = await fetch(`/api/booking-question-requirements${buildQuery(options)}`, { cache: "no-store" });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}

export async function createBookingQuestionRequirement(input: {
  tenantId: number;
  companyId: number;
  requirementCode: string;
  requirementName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BookingQuestionRequirement> {
  const res = await fetch("/api/booking-question-requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}

export async function listBookingQuestionOperators(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BookingQuestionOperator[]> {
  const res = await fetch(`/api/booking-question-operators${buildQuery(options)}`, { cache: "no-store" });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}

export async function createBookingQuestionOperator(input: {
  tenantId: number;
  companyId: number;
  operatorCode: string;
  operatorName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BookingQuestionOperator> {
  const res = await fetch("/api/booking-question-operators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BookingQuestionLookupsApiError(await parseError(res), res.status);
  return res.json();
}
