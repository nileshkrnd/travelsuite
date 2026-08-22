"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Users,
  Zap,
  CalendarClock,
  Route as RouteIcon,
  MapPinned,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Building2,
  Info,
  ChevronRight,
  ChevronLeft,
  PackageSearch,
  ExternalLink,
  ListChecks,
  X,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { getServiceProduct, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { getServiceProductConfiguration } from "@/lib/services/service-product-configurations.service";
import { listServiceProductMedia } from "@/lib/services/service-product-media.service";
import { listServiceProductInclusionExclusions } from "@/lib/services/service-product-inclusion-exclusions.service";
import { listServiceProductItineraries } from "@/lib/services/service-product-itineraries.service";
import { listServiceProductLocations } from "@/lib/services/service-product-locations.service";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listServiceProductCancellationPolicies } from "@/lib/services/service-product-cancellation-policies.service";
import { listServiceProductRates } from "@/lib/services/service-product-rates.service";
import { listServiceProductContentSections } from "@/lib/services/service-product-content-sections.service";
import { listServiceProductAdditionalInfo } from "@/lib/services/service-product-additional-info.service";
import type {
  ServiceProduct,
  ServiceProductConfiguration,
  ServiceProductMedia,
  ServiceProductInclusionExclusion,
  ServiceProductItinerary,
  ServiceProductLocation,
  ServiceProductOption,
  ServiceProductVariant,
  ServiceProductCancellationPolicy,
  ServiceProductRate,
  ServiceProductContentSection,
  ServiceProductAdditionalInfo,
  RoleDef,
} from "@/types";

interface DetailData {
  product: ServiceProduct;
  configuration: ServiceProductConfiguration | null;
  media: ServiceProductMedia[];
  inclusionExclusions: ServiceProductInclusionExclusion[];
  itineraries: ServiceProductItinerary[];
  locations: ServiceProductLocation[];
  options: ServiceProductOption[];
  variantsByOption: Map<number, ServiceProductVariant[]>;
  cancellationPolicies: ServiceProductCancellationPolicy[];
  rates: ServiceProductRate[];
  contentSections: ServiceProductContentSection[];
  additionalInfo: ServiceProductAdditionalInfo[];
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function SectionCard({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20 p-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {count !== undefined && (
          <Badge variant="outline" className="ms-1">
            {count}
          </Badge>
        )}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function GalleryFallback({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a]">
      <Icon className="h-8 w-8 text-white/40" />
    </div>
  );
}

/** Viator-style hero gallery: large photo with prev/next arrows + a thumbnail strip, opening a full slider lightbox on click. */
function GalleryViewer({ media, productName }: { media: ServiceProductMedia[]; productName: string }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const count = media.length;

  const goPrev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const goNext = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, goPrev, goNext]);

  if (count === 0) {
    return (
      <div className="aspect-[16/9] w-full overflow-hidden rounded-xl sm:aspect-[2/1]">
        <GalleryFallback icon={ImageIcon} />
      </div>
    );
  }

  const current = media[index];

  return (
    <>
      <div className="space-y-2">
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted sm:aspect-[2/1]">
          <button type="button" onClick={() => setLightboxOpen(true)} className="block h-full w-full">
            <img src={current.mediaUrl} alt={current.mediaTitle ?? productName} className="h-full w-full object-cover" />
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {media.map((m, i) => (
              <button
                key={m.serviceProductMediaId}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                  i === index ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={m.thumbnailUrl || m.mediaUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
              className="rounded-full p-1.5 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            {count > 1 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={current.mediaUrl}
              alt={current.mediaTitle ?? productName}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            {count > 1 && (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
          {count > 1 && (
            <div className="flex justify-center gap-1.5 overflow-x-auto p-4">
              {media.map((m, i) => (
                <button
                  key={m.serviceProductMediaId}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                    i === index ? "ring-white" : "ring-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={m.thumbnailUrl || m.mediaUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Renders one typed content section — numbered steps with sub-points for "What to Expect", plain bullet groups otherwise. */
function ContentSectionBlock({ section }: { section: ServiceProductContentSection }) {
  return (
    <div className="space-y-4">
      {section.sectionDescription && (
        <p className="text-sm text-muted-foreground">{stripHtml(section.sectionDescription)}</p>
      )}
      <ul className="divide-y divide-border">
        {section.items.map((item) => (
          <li key={item.serviceProductContentSectionItemId} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm font-medium">{item.itemTitle}</p>
            {item.itemDescription && (
              <p className="mt-1 text-sm text-muted-foreground">{stripHtml(item.itemDescription)}</p>
            )}
            {item.points.length > 0 && (
              <ul className="mt-2 space-y-1.5 ps-1">
                {item.points.map((p) => (
                  <li
                    key={p.serviceProductContentSectionItemPointId}
                    className="flex items-start gap-2 text-sm text-foreground/90"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                    {p.pointText}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Structured yes/no + value facts (accessibility, group size, …), rendered like Viator's Additional Info checklist. */
function AdditionalInfoBlock({ info }: { info: ServiceProductAdditionalInfo[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {info.map((row) => {
        if (row.valueTypeCode === "BOOLEAN") {
          const isYes = row.valueBoolean === true;
          const label = row.infoTypeName ?? "—";
          return (
            <li key={row.serviceProductAdditionalInfoId} className="flex items-start gap-2 text-sm">
              {isYes ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span>{isYes ? label : `Not ${label.charAt(0).toLowerCase()}${label.slice(1)}`}</span>
            </li>
          );
        }
        const value =
          row.valueText ??
          (row.valueNumber != null ? String(row.valueNumber) : row.valueDate ?? row.valueTime ?? row.valueDateTime ?? "—");
        return (
          <li key={row.serviceProductAdditionalInfoId} className="flex items-start gap-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {row.infoTypeName}: <span className="font-medium">{value}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ProductDetail({ roleDef: _roleDef }: { roleDef: RoleDef }) {
  const { role, serviceProductId } = useParams<{ role: string; serviceProductId: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = Number(serviceProductId);
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [
          product,
          configuration,
          media,
          inclusionExclusions,
          itineraries,
          locations,
          options,
          cancellationPolicies,
          rates,
          contentSections,
          additionalInfo,
        ] = await Promise.all([
          getServiceProduct(id),
          getServiceProductConfiguration(id),
          listServiceProductMedia({ serviceProductId: id, activeOnly: true }),
          listServiceProductInclusionExclusions({ serviceProductId: id, activeOnly: true }),
          listServiceProductItineraries({ serviceProductId: id, activeOnly: true }),
          listServiceProductLocations({ serviceProductId: id, activeOnly: true }),
          listServiceProductOptions({ serviceProductId: id, activeOnly: true }),
          listServiceProductCancellationPolicies({ serviceProductId: id, activeOnly: true }),
          listServiceProductRates({ serviceProductId: id, activeOnly: true }),
          listServiceProductContentSections({ serviceProductId: id, activeOnly: true }),
          listServiceProductAdditionalInfo({ serviceProductId: id, activeOnly: true }),
        ]);

        const variantEntries = await Promise.all(
          options.map(async (o) => [
            o.serviceProductOptionId,
            await listServiceProductVariants({ serviceProductOptionId: o.serviceProductOptionId, activeOnly: true }),
          ] as const)
        );
        const variantsByOption = new Map(variantEntries);

        setData({
          product,
          configuration,
          media,
          inclusionExclusions,
          itineraries: [...itineraries].sort((a, b) => {
            const dayA = a.dayNumber ?? 999;
            const dayB = b.dayNumber ?? 999;
            if (dayA !== dayB) return dayA - dayB;
            return a.sequenceNumber - b.sequenceNumber;
          }),
          locations,
          options,
          variantsByOption,
          cancellationPolicies,
          rates,
          contentSections: [...contentSections].sort((a, b) => a.displayOrder - b.displayOrder),
          additionalInfo,
        });
      } catch (error) {
        setLoadError(error instanceof ServiceProductsApiError ? error.message : "Failed to load product details");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [serviceProductId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="aspect-[21/9] w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={PackageSearch}
          tone="muted"
          heading="Product not found"
          description={loadError ?? "This product could not be loaded."}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/sales/product-catalog`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </Button>
          }
        />
      </div>
    );
  }

  const {
    product,
    configuration,
    media,
    inclusionExclusions,
    itineraries,
    locations,
    options,
    variantsByOption,
    cancellationPolicies,
    rates,
    contentSections,
    additionalInfo,
  } = data;

  const inclusions = inclusionExclusions.filter((i) => i.inclusionExclusionTypeName === "Inclusion");
  const exclusions = inclusionExclusions.filter((i) => i.inclusionExclusionTypeName === "Exclusion");
  const location = [product.cityName, product.regionName, product.countryName].filter(Boolean).join(", ");

  const durationLabel = configuration?.durationValue?.trim() || null;
  const paxLabel =
    configuration?.minimumPax != null || configuration?.maximumPax != null
      ? `${configuration?.minimumPax ?? 1}–${configuration?.maximumPax ?? "∞"} pax`
      : null;

  const rateAmounts = rates.map((r) => r.rateAmount);
  const fromPrice = rateAmounts.length > 0 ? Math.min(...rateAmounts) : null;
  const priceVaries = new Set(rateAmounts).size > 1;

  // Best (largest) free-cancellation window across default/primary policies, for a Viator-style one-line summary.
  const freeCancellationDays = cancellationPolicies
    .flatMap((p) => p.rules)
    .filter((r) => r.penaltyValue === 0)
    .reduce<number | null>((max, r) => (max == null || r.fromDaysBefore > max ? r.fromDaysBefore : max), null);

  const sections = [
    { id: "overview", label: "Overview" },
    inclusionExclusions.length > 0 ? { id: "included", label: "Included / Excluded" } : null,
    locations.length > 0 ? { id: "meeting", label: "Meeting & Pickup" } : null,
    itineraries.length > 0 ? { id: "itinerary", label: "Itinerary" } : null,
    ...contentSections.map((s) => ({ id: `content-${s.serviceProductContentSectionId}`, label: s.sectionTitle })),
    additionalInfo.length > 0 ? { id: "additional-info", label: "Additional Info" } : null,
    options.length > 0 ? { id: "options", label: "Options & Variants" } : null,
    cancellationPolicies.length > 0 ? { id: "cancellation", label: "Cancellation Policy" } : null,
  ].filter((s): s is { id: string; label: string } => s !== null);

  return (
    <div className="space-y-6 pb-16">
      <div className="mx-auto max-w-7xl space-y-5 px-4 pt-6 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href={`/${role}/sales/product-catalog`} />}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to catalog
        </Button>

        <GalleryViewer media={media} productName={product.serviceProductName} />

        {/* Title block */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {product.serviceTypeName && <Badge variant="secondary">{product.serviceTypeName}</Badge>}
            {product.classificationName && <Badge variant="secondary">{product.classificationName}</Badge>}
            {product.categoryName && <Badge variant="secondary">{product.categoryName}</Badge>}
            {product.isFeatured && (
              <Badge className="gap-1 bg-amber-500 text-white">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
          </div>
          <h1 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">{product.serviceProductName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{product.serviceProductCode}</span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            {product.supplierName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {product.supplierName}
              </span>
            )}
          </div>

          {(durationLabel || paxLabel || configuration) && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
              {durationLabel && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {durationLabel}
                </span>
              )}
              {paxLabel && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {paxLabel}
                </span>
              )}
              {configuration?.isInstantConfirmation && (
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Instant confirmation
                </span>
              )}
              {configuration?.isPickupRequired && (
                <span className="flex items-center gap-1.5">
                  <MapPinned className="h-4 w-4 text-muted-foreground" />
                  Pickup offered
                </span>
              )}
              {configuration?.isScheduleRequired && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Fixed schedule
                </span>
              )}
            </div>
          )}
        </div>

        {sections.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-border pb-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SectionCard id="overview" icon={Info} title="Overview">
              {product.description || product.shortDescription ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {stripHtml(product.description) || stripHtml(product.shortDescription)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided yet.</p>
              )}
            </SectionCard>

            {inclusionExclusions.length > 0 && (
              <SectionCard id="included" icon={CheckCircle2} title="What's Included / Excluded">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Included
                    </p>
                    {inclusions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-2">
                        {inclusions.map((i) => (
                          <li key={i.serviceProductInclusionExclusionId} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              {i.itemName}
                              {i.quantity != null && (
                                <span className="text-muted-foreground"> ({i.quantity}{i.unitName ? ` ${i.unitName}` : ""})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Excluded</p>
                    {exclusions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-2">
                        {exclusions.map((i) => (
                          <li key={i.serviceProductInclusionExclusionId} className="flex items-start gap-2 text-sm">
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>{i.itemName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </SectionCard>
            )}

            {locations.length > 0 && (
              <SectionCard id="meeting" icon={MapPinned} title="Meeting & Pickup" count={locations.length}>
                <div className="space-y-4">
                  {locations.map((loc) => (
                    <div key={loc.serviceProductLocationId} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="mb-1 flex items-center gap-1.5">
                        <p className="text-sm font-semibold">{loc.locationTypeName ?? "Location"}</p>
                        {loc.isPrimary && (
                          <Badge variant="secondary" className="text-[10px]">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{loc.locationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[loc.addressLine1, loc.cityName, loc.regionName, loc.countryName].filter(Boolean).join(", ")}
                      </p>
                      {loc.locationInstructions && (
                        <p className="mt-1.5 text-sm text-muted-foreground">{stripHtml(loc.locationInstructions)}</p>
                      )}
                      {loc.googleMapUrl && (
                        <a
                          href={loc.googleMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Open in Google Maps
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {itineraries.length > 0 && (
              <SectionCard id="itinerary" icon={RouteIcon} title="Itinerary" count={itineraries.length}>
                <ol className="space-y-0">
                  {itineraries.map((stop, idx) => (
                    <li key={stop.serviceProductItineraryId} className="relative flex gap-4 pb-6 last:pb-0">
                      {idx < itineraries.length - 1 && (
                        <span className="absolute left-3.5 top-8 h-full w-px bg-border" aria-hidden />
                      )}
                      <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {stop.dayNumber ?? idx + 1}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium">{stop.title}</p>
                          {stop.isHighlight && (
                            <Badge className="gap-1 bg-amber-500 text-white">
                              <Star className="h-3 w-3 fill-current" />
                              Highlight
                            </Badge>
                          )}
                          {stop.isOptional && <Badge variant="outline">Optional</Badge>}
                          {stop.isOvernight && <Badge variant="outline">Overnight</Badge>}
                        </div>
                        {stop.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{stripHtml(stop.description)}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {stop.durationValue != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {stop.durationValue} {stop.durationUnitName ?? ""}
                            </span>
                          )}
                          {stop.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {stop.locationName}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}

            {contentSections.map((section) => (
              <SectionCard
                key={section.serviceProductContentSectionId}
                id={`content-${section.serviceProductContentSectionId}`}
                icon={RouteIcon}
                title={section.sectionTitle}
                count={section.items.length}
              >
                <ContentSectionBlock section={section} />
              </SectionCard>
            ))}

            {additionalInfo.length > 0 && (
              <SectionCard id="additional-info" icon={ListChecks} title="Additional Info" count={additionalInfo.length}>
                <AdditionalInfoBlock info={additionalInfo} />
              </SectionCard>
            )}

            {options.length > 0 && (
              <SectionCard id="options" icon={Layers} title="Options & Variants" count={options.length}>
                <div className="space-y-4">
                  {options.map((opt) => {
                    const variants = variantsByOption.get(opt.serviceProductOptionId) ?? [];
                    return (
                      <div key={opt.serviceProductOptionId} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium">{opt.optionName}</p>
                          {opt.isDefault && (
                            <Badge variant="secondary" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">{opt.optionCode}</span>
                        </div>
                        {opt.description && <p className="mt-1 text-xs text-muted-foreground">{stripHtml(opt.description)}</p>}
                        {variants.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {variants.map((v) => (
                              <Badge key={v.serviceProductVariantId} variant="outline" className="gap-1">
                                {v.variantName}
                                {v.isDefault && <span className="text-[9px] text-muted-foreground">default</span>}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {cancellationPolicies.length > 0 && (
              <SectionCard id="cancellation" icon={ShieldCheck} title="Cancellation Policy" count={cancellationPolicies.length}>
                <div className="space-y-4">
                  {cancellationPolicies.map((policy) => (
                    <div key={policy.serviceProductCancellationPolicyId} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{policy.policyName}</p>
                        {policy.isDefault && (
                          <Badge variant="secondary" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                        {policy.optionName && <Badge variant="outline" className="text-[10px]">{policy.optionName}</Badge>}
                        {policy.variantName && <Badge variant="outline" className="text-[10px]">{policy.variantName}</Badge>}
                      </div>
                      {policy.rules.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground">
                                <th className="py-1.5 pe-4 text-left font-medium">Window before start</th>
                                <th className="py-1.5 pe-4 text-left font-medium">Type</th>
                                <th className="py-1.5 text-left font-medium">Penalty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {policy.rules.map((rule) => (
                                <tr key={rule.serviceProductCancellationPolicyRuleId} className="border-b border-border/50 last:border-0">
                                  <td className="py-1.5 pe-4">
                                    {rule.fromDaysBefore}
                                    {rule.toDaysBefore != null ? `–${rule.toDaysBefore}` : "+"} days
                                  </td>
                                  <td className="py-1.5 pe-4">{rule.cancellationPolicyTypeName ?? "—"}</td>
                                  <td className="py-1.5 font-medium">{rule.penaltyValue}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Sticky price/booking-summary sidebar — the internal-review equivalent of the OTA "book now" card */}
          <div className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-6">
              <Card className="p-5">
                {fromPrice != null ? (
                  <>
                    <p className="text-xs text-muted-foreground">{priceVaries ? "Price varies by group size" : "Starting from"}</p>
                    <p className="text-3xl font-semibold tabular-nums">From {fromPrice.toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active rates configured yet.</p>
                )}

                {freeCancellationDays != null && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Free cancellation up to {freeCancellationDays} day{freeCancellationDays === 1 ? "" : "s"} before start
                  </div>
                )}

                {rates.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {rates.map((rate) => (
                      <div key={rate.serviceProductRateId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-muted-foreground">
                          {[rate.optionName, rate.variantName].filter(Boolean).join(" — ") || rate.rateTypeName || "Standard"}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">{rate.rateAmount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  nativeButton={false}
                  render={<Link href={`/${role}/masters/service-product/${product.serviceProductId}`} />}
                >
                  Open in Product Master
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Card>

              <Card className="p-5">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Code</dt>
                    <dd className="font-mono text-xs">{product.serviceProductCode}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.statusName ?? (product.isActive ? "Active" : "Inactive")}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Online sellable</dt>
                    <dd>{product.isOnlineSellable ? "Yes" : "No"}</dd>
                  </div>
                  {product.supplierName && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Supplier</dt>
                      <dd className="text-right">{product.supplierName}</dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductCatalogDetailPage() {
  return <AccessGate module="productCatalog">{(roleDef) => <ProductDetail roleDef={roleDef} />}</AccessGate>;
}
