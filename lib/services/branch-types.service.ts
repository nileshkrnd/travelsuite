import { toAppBranchType, type BranchTypeRow } from "@/lib/mappers/branch.mapper";
import type { BranchType } from "@/types";

export class BranchTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BranchTypesApiError";
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

export async function listBranchTypes(options?: { activeOnly?: boolean }): Promise<BranchType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/branch-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as BranchTypeRow[]).map(toAppBranchType);
}
