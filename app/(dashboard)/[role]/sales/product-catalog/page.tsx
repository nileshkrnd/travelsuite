"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Star,
  ImageOff,
  LayoutGrid,
  List as ListIcon,
  SlidersHorizontal,
  X,
  Car,
  Ship,
  TrainFront,
  ShieldCheck,
  Compass,
  Sparkles,
  Binoculars,
  Plane,
  Building2,
  FileCheck,
  UserRound,
  UtensilsCrossed,
  Ticket as TicketIcon,
  Package,
  ChevronDown,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { listServiceProductMedia, ServiceProductMediaApiError } from "@/lib/services/service-product-media.service";
import { listServiceProductRates, ServiceProductRatesApiError } from "@/lib/services/service-product-rates.service";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, ServiceProduct } from "@/types";

const SERVICE_TYPE_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /transfer|car hire|rail/i, icon: Car },
  { match: /cruise/i, icon: Ship },
  { match: /rail/i, icon: TrainFront },
  { match: /insurance|visa/i, icon: ShieldCheck },
  { match: /tour guide/i, icon: UserRound },
  { match: /tour/i, icon: Compass },
  { match: /activity/i, icon: Sparkles },
  { match: /sightseeing/i, icon: Binoculars },
  { match: /flight/i, icon: Plane },
  { match: /hotel/i, icon: Building2 },
  { match: /visa/i, icon: FileCheck },
  { match: /restaurant/i, icon: UtensilsCrossed },
  { match: /ticket/i, icon: TicketIcon },
];

function iconForServiceType(name: string | undefined): LucideIcon {
  if (!name) return Package;
  return SERVICE_TYPE_ICONS.find((entry) => entry.match.test(name))?.icon ?? Package;
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface OptionEntry {
  id: number;
  label: string;
}

function uniqueOptions(items: { id: number | null | undefined; label: string | undefined }[]): OptionEntry[] {
  const map = new Map<number, string>();
  for (const item of items) {
    if (item.id != null && item.label) map.set(item.id, item.label);
  }
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

type SortMode = "featured" | "name" | "priceLow" | "priceHigh";
type ViewMode = "grid" | "list";

interface PriceInfo {
  from: number;
  varies: boolean;
}

/** One Viator-style tour card — image, service type, title, location, price — shared by grid and list layouts. */
function ProductCard({
  product,
  href,
  image,
  price,
  description,
  viewMode,
}: {
  product: ServiceProduct;
  href: string;
  image: string | undefined;
  price: PriceInfo | undefined;
  description: string;
  viewMode: ViewMode;
}) {
  const ServiceIcon = iconForServiceType(product.serviceTypeName);
  const location = [product.cityName, product.countryName].filter(Boolean).join(", ");

  const cover = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        viewMode === "grid" ? "aspect-[4/3] w-full rounded-t-xl" : "aspect-[4/3] w-full rounded-lg sm:w-64"
      )}
    >
      {image ? (
        <img
          src={image}
          alt={product.serviceProductName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] text-white/70">
          <ServiceIcon className="h-10 w-10" />
        </div>
      )}
      {product.isFeatured && (
        <Badge className="absolute start-2 top-2 gap-1 bg-amber-500 text-white shadow-sm">
          <Star className="h-3 w-3 fill-current" />
          Featured
        </Badge>
      )}
      {!image && (
        <div className="absolute bottom-2 end-2 text-white/50">
          <ImageOff className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (viewMode === "grid") {
    return (
      <Link
        href={href}
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
      >
        {cover}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <ServiceIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{product.serviceTypeName ?? "—"}</span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
            {product.serviceProductName}
          </h3>
          {location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          <div className="mt-auto pt-2">
            {price ? (
              <>
                <p className="text-[11px] text-muted-foreground">{price.varies ? "Price varies" : "Starting from"}</p>
                <p className="text-base font-semibold tabular-nums text-foreground">From {price.from.toLocaleString()}</p>
              </>
            ) : (
              <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                View details →
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-primary/40 hover:shadow-md sm:flex-row"
    >
      {cover}
      <div className="flex flex-1 flex-col gap-1.5 py-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <ServiceIcon className="h-3.5 w-3.5" />
          {product.serviceTypeName ?? "—"}
          {product.classificationName && (
            <span className="font-normal normal-case text-muted-foreground">· {product.classificationName}</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
          {product.serviceProductName}
        </h3>
        {location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <span className="font-mono text-[11px] text-muted-foreground">{product.serviceProductCode}</span>
          <div className="text-right">
            {price ? (
              <>
                <p className="text-[11px] text-muted-foreground">{price.varies ? "Price varies" : "Starting from"}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">From {price.from.toLocaleString()}</p>
              </>
            ) : (
              <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                View details →
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCatalogGrid({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [coverImages, setCoverImages] = useState<Map<number, string>>(new Map());
  const [prices, setPrices] = useState<Map<number, PriceInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState<number | null>(null);
  const [classificationId, setClassificationId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("featured");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  useEffect(() => {
    async function load() {
      if (scopeTenantId <= 0) {
        setProducts([]);
        setLoading(false);
        setLoadError(platformMode ? "Select a tenant workspace to browse products." : "Missing tenant scope.");
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await listServiceProducts({ tenantId: scopeTenantId, activeOnly: true });
        setProducts(rows);
        if (rows.length > 0) {
          const ids = rows.map((r) => r.serviceProductId);
          const [media, rates] = await Promise.all([
            listServiceProductMedia({ serviceProductIds: ids, activeOnly: true }),
            listServiceProductRates({ serviceProductIds: ids, activeOnly: true }),
          ]);
          const imageMap = new Map<number, string>();
          for (const m of media) {
            if (!imageMap.has(m.serviceProductId)) {
              imageMap.set(m.serviceProductId, m.thumbnailUrl || m.mediaUrl);
            }
          }
          setCoverImages(imageMap);

          const amountsByProduct = new Map<number, number[]>();
          for (const r of rates) {
            const list = amountsByProduct.get(r.serviceProductId) ?? [];
            list.push(r.rateAmount);
            amountsByProduct.set(r.serviceProductId, list);
          }
          const priceMap = new Map<number, PriceInfo>();
          for (const [productId, amounts] of amountsByProduct) {
            const min = Math.min(...amounts);
            const distinct = new Set(amounts.map((a) => a));
            priceMap.set(productId, { from: min, varies: distinct.size > 1 });
          }
          setPrices(priceMap);
        } else {
          setCoverImages(new Map());
          setPrices(new Map());
        }
      } catch (error) {
        setLoadError(
          error instanceof ServiceProductsApiError ||
            error instanceof ServiceProductMediaApiError ||
            error instanceof ServiceProductRatesApiError
            ? error.message
            : "Failed to load products"
        );
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [scopeTenantId, platformMode]);

  const serviceTypeOptions = useMemo(
    () => uniqueOptions(products.map((p) => ({ id: p.serviceTypeId, label: p.serviceTypeName }))),
    [products]
  );
  const classificationOptions = useMemo(
    () =>
      uniqueOptions(
        products
          .filter((p) => !serviceTypeId || p.serviceTypeId === serviceTypeId)
          .map((p) => ({ id: p.serviceProductClassificationId, label: p.classificationName }))
      ),
    [products, serviceTypeId]
  );
  const categoryOptions = useMemo(
    () =>
      uniqueOptions(
        products
          .filter((p) => !serviceTypeId || p.serviceTypeId === serviceTypeId)
          .filter((p) => !classificationId || p.serviceProductClassificationId === classificationId)
          .map((p) => ({ id: p.serviceProductCategoryId, label: p.categoryName }))
      ),
    [products, serviceTypeId, classificationId]
  );
  const countryOptions = useMemo(
    () => uniqueOptions(products.map((p) => ({ id: p.countryId, label: p.countryName }))),
    [products]
  );
  const cityOptions = useMemo(
    () =>
      uniqueOptions(
        products
          .filter((p) => !countryId || p.countryId === countryId)
          .map((p) => ({ id: p.cityId, label: p.cityName }))
      ),
    [products, countryId]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = products.filter((p) => {
      if (serviceTypeId && p.serviceTypeId !== serviceTypeId) return false;
      if (classificationId && p.serviceProductClassificationId !== classificationId) return false;
      if (categoryId && p.serviceProductCategoryId !== categoryId) return false;
      if (countryId && p.countryId !== countryId) return false;
      if (cityId && p.cityId !== cityId) return false;
      if (term) {
        const haystack = `${p.serviceProductName} ${p.serviceProductCode} ${p.shortDescription ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      if (sort === "name") return a.serviceProductName.localeCompare(b.serviceProductName);
      if (sort === "priceLow" || sort === "priceHigh") {
        const pa = prices.get(a.serviceProductId)?.from ?? Infinity;
        const pb = prices.get(b.serviceProductId)?.from ?? Infinity;
        return sort === "priceLow" ? pa - pb : pb - pa;
      }
      // featured
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.displayOrder - b.displayOrder || a.serviceProductName.localeCompare(b.serviceProductName);
    });
    return result;
  }, [products, search, serviceTypeId, classificationId, categoryId, countryId, cityId, sort, prices]);

  const activeFilterCount = [classificationId, categoryId, countryId, cityId].filter((v) => v != null).length;

  function clearFilters() {
    setServiceTypeId(null);
    setClassificationId(null);
    setCategoryId(null);
    setCountryId(null);
    setCityId(null);
    setSearch("");
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Product Catalog"
        description="Browse every sellable product in one place — filter by service, classification, and destination."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoreFilters((v) => !v)}
              className={cn(activeFilterCount > 0 && "border-primary text-primary")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ms-1 h-4 min-w-4 px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMoreFilters && "rotate-180")} />
            </Button>
            {(activeFilterCount > 0 || search || serviceTypeId) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>

          {/* Category chips — mirrors a classic OTA category rail */}
          {serviceTypeOptions.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setServiceTypeId(null);
                  setClassificationId(null);
                  setCategoryId(null);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  !serviceTypeId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                All
              </button>
              {serviceTypeOptions.map((o) => {
                const Icon = iconForServiceType(o.label);
                const active = serviceTypeId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setServiceTypeId(active ? null : o.id);
                      setClassificationId(null);
                      setCategoryId(null);
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {showMoreFilters && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Classification</Label>
                <Select
                  value={classificationId ? String(classificationId) : "all"}
                  onValueChange={(v) => {
                    setClassificationId(v === "all" ? null : Number(v));
                    setCategoryId(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classifications</SelectItem>
                    {classificationOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={categoryId ? String(categoryId) : "all"}
                  onValueChange={(v) => setCategoryId(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Select
                  value={countryId ? String(countryId) : "all"}
                  onValueChange={(v) => {
                    setCountryId(v === "all" ? null : Number(v));
                    setCityId(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countryOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Select value={cityId ? String(cityId) : "all"} onValueChange={(v) => setCityId(v === "all" ? null : Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cityOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse gap-4 overflow-hidden rounded-xl border border-border bg-card p-3">
              <div className="aspect-[4/3] w-64 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-3 w-1/4 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !loadError && filtered.length === 0 ? (
        <EmptyState
          icon={products.length === 0 ? LayoutGrid : SlidersHorizontal}
          tone="muted"
          heading={products.length === 0 ? "No products yet" : "No matching products"}
          description={
            products.length === 0
              ? "Products created in the Product Master will show up here."
              : "Try a different search term or clear filters to see more results."
          }
          size="compact"
          action={
            products.length > 0 ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        !loadError && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded transition-colors",
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded transition-colors",
                      viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Sort by: Featured</SelectItem>
                      <SelectItem value="name">Sort by: Name</SelectItem>
                      <SelectItem value="priceLow">Price: Low to high</SelectItem>
                      <SelectItem value="priceHigh">Price: High to low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-4"}>
              {filtered.map((product) => (
                <ProductCard
                  key={product.serviceProductId}
                  product={product}
                  href={`/${role}/sales/product-catalog/${product.serviceProductId}`}
                  image={coverImages.get(product.serviceProductId)}
                  price={prices.get(product.serviceProductId)}
                  description={stripHtml(product.shortDescription ?? product.description)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default function ProductCatalogPage() {
  return <AccessGate module="productCatalog">{(roleDef) => <ProductCatalogGrid roleDef={roleDef} />}</AccessGate>;
}
