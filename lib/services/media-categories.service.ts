import type { MediaCategory } from "@/types";
import { toAppMediaCategory, type MediaCategoryRow } from "@/lib/mappers/media-category.mapper";

export class MediaCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MediaCategoriesApiError";
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

export async function listMediaCategories(options?: { activeOnly?: boolean }): Promise<MediaCategory[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/media-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new MediaCategoriesApiError(await parseError(res), res.status);
  return ((await res.json()) as MediaCategoryRow[]).map(toAppMediaCategory);
}
