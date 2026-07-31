import { toAppSubscriptionProduct } from "@/lib/mappers/subscription.mapper";
import type { SubscriptionProduct } from "@/types";

export class SubscriptionProductsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SubscriptionProductsApiError";
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

export async function listSubscriptionProducts(options?: {
  activeOnly?: boolean;
}): Promise<SubscriptionProduct[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/subscription-products${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppSubscriptionProduct>[0][]).map(
    toAppSubscriptionProduct
  );
}

export async function getSubscriptionProduct(
  subscriptionProductId: number
): Promise<SubscriptionProduct> {
  const res = await fetch(`/api/subscription-products/${subscriptionProductId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
  return toAppSubscriptionProduct(await res.json());
}

export async function createSubscriptionProduct(input: {
  subscriptionProductName: string;
  description?: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<SubscriptionProduct> {
  const res = await fetch("/api/subscription-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
  return toAppSubscriptionProduct(await res.json());
}

export async function updateSubscriptionProduct(
  subscriptionProductId: number,
  input: {
    subscriptionProductName: string;
    description?: string;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<SubscriptionProduct> {
  const res = await fetch(`/api/subscription-products/${subscriptionProductId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
  return toAppSubscriptionProduct(await res.json());
}

export async function setSubscriptionProductActive(
  subscriptionProductId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SubscriptionProduct> {
  const res = await fetch(`/api/subscription-products/${subscriptionProductId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
  return toAppSubscriptionProduct(await res.json());
}

export async function deleteSubscriptionProduct(subscriptionProductId: number): Promise<void> {
  const res = await fetch(`/api/subscription-products/${subscriptionProductId}`, { method: "DELETE" });
  if (!res.ok) throw new SubscriptionProductsApiError(await parseError(res), res.status);
}
