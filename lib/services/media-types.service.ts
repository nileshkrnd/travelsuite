import type { MediaType } from "@/types";
import { toAppMediaType, type MediaTypeRow } from "@/lib/mappers/media-type.mapper";

export class MediaTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MediaTypesApiError";
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

export async function listMediaTypes(options?: { activeOnly?: boolean }): Promise<MediaType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/media-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new MediaTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as MediaTypeRow[]).map(toAppMediaType);
}
