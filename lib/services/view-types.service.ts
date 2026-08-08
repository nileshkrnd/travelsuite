import type { ViewType } from "@/types";
import { toAppViewType, type ViewTypeRow } from "@/lib/mappers/view-type.mapper";

export class ViewTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ViewTypesApiError";
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

export async function listViewTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<ViewType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/view-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ViewTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as ViewTypeRow[];
  return data.map(toAppViewType);
}

export interface ViewTypeWriteInput {
  viewTypeCode: string;
  viewTypeName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createViewType(input: ViewTypeWriteInput & { createdBy: number }): Promise<ViewType> {
  const res = await fetch("/api/view-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ViewTypesApiError(await parseError(res), res.status);
  return toAppViewType(await res.json());
}

export async function updateViewType(
  viewTypeId: number,
  input: ViewTypeWriteInput & { modifiedBy: number }
): Promise<ViewType> {
  const res = await fetch(`/api/view-types/${viewTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ViewTypesApiError(await parseError(res), res.status);
  return toAppViewType(await res.json());
}

export async function setViewTypeActive(
  viewTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ViewType> {
  const res = await fetch(`/api/view-types/${viewTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ViewTypesApiError(await parseError(res), res.status);
  return toAppViewType(await res.json());
}

export async function deleteViewType(viewTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/view-types/${viewTypeId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new ViewTypesApiError(await parseError(res), res.status);
}
