import { toAppMealPlan, type MealPlanRow } from "@/lib/mappers/meal-plan.mapper";
import type { MealPlan } from "@/types";

export class MealPlansApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MealPlansApiError";
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

export async function listMealPlans(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<MealPlan[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/meal-plans${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new MealPlansApiError(await parseError(res), res.status);
  return ((await res.json()) as MealPlanRow[]).map(toAppMealPlan);
}

export async function createMealPlan(input: {
  mealPlanCode: string;
  mealPlanName: string;
  description?: string | null;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<MealPlan> {
  const res = await fetch("/api/meal-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new MealPlansApiError(await parseError(res), res.status);
  return toAppMealPlan(await res.json());
}

export async function updateMealPlan(
  mealPlanId: number,
  input: {
    mealPlanCode: string;
    mealPlanName: string;
    description?: string | null;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<MealPlan> {
  const res = await fetch(`/api/meal-plans/${mealPlanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new MealPlansApiError(await parseError(res), res.status);
  return toAppMealPlan(await res.json());
}

export async function setMealPlanActive(
  mealPlanId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<MealPlan> {
  const res = await fetch(`/api/meal-plans/${mealPlanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new MealPlansApiError(await parseError(res), res.status);
  return toAppMealPlan(await res.json());
}

export async function deleteMealPlan(mealPlanId: number): Promise<void> {
  const res = await fetch(`/api/meal-plans/${mealPlanId}`, { method: "DELETE" });
  if (!res.ok) throw new MealPlansApiError(await parseError(res), res.status);
}
