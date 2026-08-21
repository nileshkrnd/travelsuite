import {
  toAppServiceProductCancellationPolicy,
  type ServiceProductCancellationPolicyRow,
} from "@/lib/mappers/service-product-cancellation-policy.mapper";
import type { ServiceProductCancellationPolicy } from "@/types";

export class ServiceProductCancellationPoliciesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductCancellationPoliciesApiError";
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

export async function listServiceProductCancellationPolicies(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductCancellationPolicy[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-cancellation-policies${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductCancellationPoliciesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductCancellationPolicyRow[]).map(toAppServiceProductCancellationPolicy);
}

export interface ServiceProductCancellationPolicyRuleInput {
  fromDaysBefore: number;
  toDaysBefore?: number | null;
  cancellationPolicyTypeId: number;
  penaltyValue: number;
  isActive?: boolean;
}

export interface ServiceProductCancellationPolicyWriteInput {
  serviceProductId: number;
  policyCode: string;
  policyName: string;
  serviceProductSupplierId?: number | null;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
  rules?: ServiceProductCancellationPolicyRuleInput[];
}

export async function createServiceProductCancellationPolicy(
  input: ServiceProductCancellationPolicyWriteInput & { createdBy: number }
): Promise<ServiceProductCancellationPolicy> {
  const res = await fetch("/api/service-product-cancellation-policies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductCancellationPoliciesApiError(await parseError(res), res.status);
  return toAppServiceProductCancellationPolicy(await res.json());
}

export async function updateServiceProductCancellationPolicy(
  serviceProductCancellationPolicyId: number,
  input: ServiceProductCancellationPolicyWriteInput & { modifiedBy: number }
): Promise<ServiceProductCancellationPolicy> {
  const res = await fetch(`/api/service-product-cancellation-policies/${serviceProductCancellationPolicyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductCancellationPoliciesApiError(await parseError(res), res.status);
  return toAppServiceProductCancellationPolicy(await res.json());
}

export async function setServiceProductCancellationPolicyActive(
  serviceProductCancellationPolicyId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductCancellationPolicy> {
  const res = await fetch(`/api/service-product-cancellation-policies/${serviceProductCancellationPolicyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductCancellationPoliciesApiError(await parseError(res), res.status);
  return toAppServiceProductCancellationPolicy(await res.json());
}

export async function deleteServiceProductCancellationPolicy(serviceProductCancellationPolicyId: number): Promise<void> {
  const res = await fetch(`/api/service-product-cancellation-policies/${serviceProductCancellationPolicyId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductCancellationPoliciesApiError(await parseError(res), res.status);
}
