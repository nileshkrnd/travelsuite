import {
  toAppServiceProductBookingQuestion,
  type ServiceProductBookingQuestionRow,
} from "@/lib/mappers/service-product-booking-question.mapper";
import type { ServiceProductBookingQuestion } from "@/types";

export class ServiceProductBookingQuestionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductBookingQuestionsApiError";
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

export async function listServiceProductBookingQuestions(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductBookingQuestion[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-booking-questions${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductBookingQuestionsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductBookingQuestionRow[]).map(toAppServiceProductBookingQuestion);
}

export interface ServiceProductBookingQuestionOptionInput {
  optionCode: string;
  optionName: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ServiceProductBookingQuestionRuleInput {
  parentQuestionId: number;
  parentQuestionOptionId?: number | null;
  bookingQuestionOperatorId: number;
  comparisonValue?: string | null;
  isActive?: boolean;
}

export interface ServiceProductBookingQuestionWriteInput {
  serviceProductId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  questionCode: string;
  questionText: string;
  bookingQuestionTypeId: number;
  bookingQuestionRequirementId: number;
  maxLength?: number | null;
  displayOrder?: number;
  isActive?: boolean;
  options?: ServiceProductBookingQuestionOptionInput[];
  rules?: ServiceProductBookingQuestionRuleInput[];
}

export async function createServiceProductBookingQuestion(
  input: ServiceProductBookingQuestionWriteInput & { createdBy: number }
): Promise<ServiceProductBookingQuestion> {
  const res = await fetch("/api/service-product-booking-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductBookingQuestionsApiError(await parseError(res), res.status);
  return toAppServiceProductBookingQuestion(await res.json());
}

export async function updateServiceProductBookingQuestion(
  serviceProductBookingQuestionId: number,
  input: ServiceProductBookingQuestionWriteInput & { modifiedBy: number }
): Promise<ServiceProductBookingQuestion> {
  const res = await fetch(`/api/service-product-booking-questions/${serviceProductBookingQuestionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductBookingQuestionsApiError(await parseError(res), res.status);
  return toAppServiceProductBookingQuestion(await res.json());
}

export async function deleteServiceProductBookingQuestion(serviceProductBookingQuestionId: number): Promise<void> {
  const res = await fetch(`/api/service-product-booking-questions/${serviceProductBookingQuestionId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductBookingQuestionsApiError(await parseError(res), res.status);
}
