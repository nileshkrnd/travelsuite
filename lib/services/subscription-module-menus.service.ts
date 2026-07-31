import { toAppSubscriptionModuleMenu } from "@/lib/mappers/subscription.mapper";
import type { SubscriptionModuleMenu } from "@/types";

export class SubscriptionModuleMenusApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SubscriptionModuleMenusApiError";
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

function mapRows(body: unknown): SubscriptionModuleMenu[] {
  const rows = Array.isArray(body) ? body : [body];
  return rows.map((row) =>
    toAppSubscriptionModuleMenu(row as Parameters<typeof toAppSubscriptionModuleMenu>[0])
  );
}

export type SubscriptionModuleMenuInput = {
  subscriptionModuleId: number;
  parentMenuId?: number | null;
  menuName: string;
  menuUrl: string;
  menuIcon?: string;
  sortOrder?: number;
  isActive?: boolean;
  /** Products that unlock this menu when under Administration (empty = common). */
  subscriptionProductIds?: number[];
};

export async function listSubscriptionModuleMenus(options?: {
  activeOnly?: boolean;
  moduleId?: number;
}): Promise<SubscriptionModuleMenu[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.moduleId !== undefined) params.set("moduleId", String(options.moduleId));
  const qs = params.toString();
  const res = await fetch(`/api/subscription-module-menus${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return mapRows(await res.json());
}

/**
 * Active menus for modules granted to a tenant.
 * Pass userId to filter by that user's Access Role CanView permissions (sidebar).
 * Omit userId for the full Module Access menu set (e.g. Permissions matrix editor).
 */
export async function listTenantSubscriptionModuleMenus(
  tenantId: number,
  options?: { userId?: number }
): Promise<SubscriptionModuleMenu[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (options?.userId != null && options.userId > 0) {
    params.set("userId", String(options.userId));
  }
  const res = await fetch(`/api/subscription-module-menus/for-tenant?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return mapRows(await res.json());
}

export async function getSubscriptionModuleMenu(
  subscriptionModuleMenuId: number
): Promise<SubscriptionModuleMenu> {
  const res = await fetch(`/api/subscription-module-menus/${subscriptionModuleMenuId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleMenu(await res.json());
}

export async function createSubscriptionModuleMenu(
  input: SubscriptionModuleMenuInput & { createdBy: number }
): Promise<SubscriptionModuleMenu> {
  const res = await fetch("/api/subscription-module-menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleMenu(await res.json());
}

export async function updateSubscriptionModuleMenu(
  subscriptionModuleMenuId: number,
  input: SubscriptionModuleMenuInput & { modifiedBy: number }
): Promise<SubscriptionModuleMenu> {
  const res = await fetch(`/api/subscription-module-menus/${subscriptionModuleMenuId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleMenu(await res.json());
}

export async function setSubscriptionModuleMenuActive(
  subscriptionModuleMenuId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SubscriptionModuleMenu> {
  const res = await fetch(`/api/subscription-module-menus/${subscriptionModuleMenuId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
  return toAppSubscriptionModuleMenu(await res.json());
}

export async function deleteSubscriptionModuleMenu(
  subscriptionModuleMenuId: number
): Promise<void> {
  const res = await fetch(`/api/subscription-module-menus/${subscriptionModuleMenuId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
}

/** Persist sibling order (priority) under the same parent. */
export async function reorderSubscriptionModuleMenus(input: {
  subscriptionModuleId: number;
  parentMenuId: number | null;
  orderedIds: number[];
  modifiedBy: number;
}): Promise<void> {
  const res = await fetch("/api/subscription-module-menus/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SubscriptionModuleMenusApiError(await parseError(res), res.status);
}
