import type { RuleType } from "@/types";

export class RuleTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RuleTypesApiError";
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

export async function listRuleTypes(options?: { activeOnly?: boolean }): Promise<RuleType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/rule-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RuleTypesApiError(await parseError(res), res.status);
  return (await res.json()) as RuleType[];
}
