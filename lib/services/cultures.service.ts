import type { Culture } from "@/types";
import { toAppCulture, type CultureRow } from "@/lib/mappers/culture.mapper";

export class CulturesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CulturesApiError";
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

export async function listCultures(options?: { activeOnly?: boolean }): Promise<Culture[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/cultures${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CulturesApiError(await parseError(res), res.status);
  return ((await res.json()) as CultureRow[]).map(toAppCulture);
}

export interface CultureWriteInput {
  cultureCode: string;
  cultureName: string;
  direction: "ltr" | "rtl";
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createCulture(input: CultureWriteInput): Promise<Culture> {
  const res = await fetch("/api/cultures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CulturesApiError(await parseError(res), res.status);
  return toAppCulture(await res.json());
}

export async function updateCulture(cultureId: number, input: CultureWriteInput): Promise<Culture> {
  const res = await fetch(`/api/cultures/${cultureId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CulturesApiError(await parseError(res), res.status);
  return toAppCulture(await res.json());
}

export async function setCultureActive(
  cultureId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Culture> {
  const res = await fetch(`/api/cultures/${cultureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new CulturesApiError(await parseError(res), res.status);
  return toAppCulture(await res.json());
}
