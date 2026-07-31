import { toAppSubscriptionModule } from "@/lib/mappers/subscription.mapper";
import type { SubscriptionModule } from "@/types";

export class SubscriptionModulesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SubscriptionModulesApiError";
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

export async function listSubscriptionModules(options?: {
  activeOnly?: boolean;
  productId?: number;
}): Promise<SubscriptionModule[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.productId !== undefined) params.set("productId", String(options.productId));
  const qs = params.toString();
  const res = await fetch(`/api/subscription-modules${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppSubscriptionModule>[0][]).map(
    toAppSubscriptionModule
  );
}

export async function getSubscriptionModule(
  subscriptionModuleId: number
): Promise<SubscriptionModule> {
  const res = await fetch(`/api/subscription-modules/${subscriptionModuleId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
  return toAppSubscriptionModule(await res.json());
}

export async function createSubscriptionModule(input: {
  subscriptionProductId: number;
  subscriptionModuleName: string;
  description?: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<SubscriptionModule> {
  const res = await fetch("/api/subscription-modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
  return toAppSubscriptionModule(await res.json());
}

export async function updateSubscriptionModule(
  subscriptionModuleId: number,
  input: {
    subscriptionProductId: number;
    subscriptionModuleName: string;
    description?: string;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<SubscriptionModule> {
  const res = await fetch(`/api/subscription-modules/${subscriptionModuleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
  return toAppSubscriptionModule(await res.json());
}

export async function setSubscriptionModuleActive(
  subscriptionModuleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SubscriptionModule> {
  const res = await fetch(`/api/subscription-modules/${subscriptionModuleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
  return toAppSubscriptionModule(await res.json());
}

export async function deleteSubscriptionModule(subscriptionModuleId: number): Promise<void> {
  const res = await fetch(`/api/subscription-modules/${subscriptionModuleId}`, { method: "DELETE" });
  if (!res.ok) throw new SubscriptionModulesApiError(await parseError(res), res.status);
}
