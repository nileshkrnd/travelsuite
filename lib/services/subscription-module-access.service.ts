import { toAppSubscriptionModuleAccess } from "@/lib/mappers/subscription.mapper";
import type { SubscriptionModuleAccess } from "@/types";

export class SubscriptionModuleAccessApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SubscriptionModuleAccessApiError";
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

export async function listSubscriptionModuleAccess(options?: {
  activeOnly?: boolean;
  tenantId?: number;
  moduleId?: number;
}): Promise<SubscriptionModuleAccess[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.moduleId !== undefined) params.set("moduleId", String(options.moduleId));
  const qs = params.toString();
  const res = await fetch(`/api/subscription-module-access${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppSubscriptionModuleAccess>[0][]).map(
    toAppSubscriptionModuleAccess
  );
}

export async function getSubscriptionModuleAccess(
  subscriptionModuleAccessId: number
): Promise<SubscriptionModuleAccess> {
  const res = await fetch(`/api/subscription-module-access/${subscriptionModuleAccessId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleAccess(await res.json());
}

export async function createSubscriptionModuleAccess(input: {
  subscriptionModuleId: number;
  tenantId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<SubscriptionModuleAccess> {
  const created = await createSubscriptionModuleAccessBatch({
    subscriptionModuleIds: [input.subscriptionModuleId],
    tenantId: input.tenantId,
    isActive: input.isActive,
    createdBy: input.createdBy,
  });
  return created[0]!;
}

export async function createSubscriptionModuleAccessBatch(input: {
  subscriptionModuleIds: number[];
  tenantId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<SubscriptionModuleAccess[]> {
  const res = await fetch("/api/subscription-module-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
  const body = await res.json();
  const rows = Array.isArray(body) ? body : [body];
  return rows.map(toAppSubscriptionModuleAccess);
}

export async function updateSubscriptionModuleAccess(
  subscriptionModuleAccessId: number,
  input: {
    subscriptionModuleId: number;
    tenantId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<SubscriptionModuleAccess> {
  const res = await fetch(`/api/subscription-module-access/${subscriptionModuleAccessId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleAccess(await res.json());
}

export async function setSubscriptionModuleAccessActive(
  subscriptionModuleAccessId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SubscriptionModuleAccess> {
  const res = await fetch(`/api/subscription-module-access/${subscriptionModuleAccessId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleAccess(await res.json());
}

export async function deleteSubscriptionModuleAccess(
  subscriptionModuleAccessId: number
): Promise<void> {
  const res = await fetch(`/api/subscription-module-access/${subscriptionModuleAccessId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new SubscriptionModuleAccessApiError(await parseError(res), res.status);
}
