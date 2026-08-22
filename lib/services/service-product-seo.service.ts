import type { ServiceProductSeo } from "@/types";

export class ServiceProductSeoApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductSeoApiError";
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

export async function getServiceProductSeo(serviceProductId: number): Promise<ServiceProductSeo | null> {
  const res = await fetch(`/api/service-product-seo?serviceProductId=${serviceProductId}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductSeoApiError(await parseError(res), res.status);
  return res.json();
}

export interface ServiceProductSeoInput {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  isIndexable?: boolean;
  isFollowable?: boolean;
}

export async function saveServiceProductSeo(
  input: ServiceProductSeoInput & { serviceProductId: number; actorId: number }
): Promise<ServiceProductSeo> {
  const res = await fetch("/api/service-product-seo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSeoApiError(await parseError(res), res.status);
  return res.json();
}
