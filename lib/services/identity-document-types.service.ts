import { toAppIdentityDocumentType, type IdentityDocumentTypeRow } from "@/lib/mappers/identity-document-type.mapper";
import type { IdentityDocumentType } from "@/types";

export class IdentityDocumentTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "IdentityDocumentTypesApiError";
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

export async function listIdentityDocumentTypes(options?: { activeOnly?: boolean }): Promise<IdentityDocumentType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/identity-document-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new IdentityDocumentTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as IdentityDocumentTypeRow[]).map(toAppIdentityDocumentType);
}
