/** SEO/metadata for a Service Product's public-facing catalog page — one row per product. */
export interface ServiceProductSeo {
  serviceProductSeoId: number;
  serviceProductId: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  isIndexable: boolean;
  isFollowable: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
