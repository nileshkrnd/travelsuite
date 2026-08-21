"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Pencil,
  History,
  Star,
  LayoutGrid,
  SlidersHorizontal,
  CalendarCheck,
  Clock,
  ListChecks,
  Route,
  MapPin,
  ImageIcon,
  ListTree,
  GitBranch,
  Building2,
  DollarSign,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getServiceProduct, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { listServiceProductStatusHistory } from "@/lib/services/service-product-status-history.service";
import { can } from "@/config/permissions";
import type { RoleDef, ServiceProduct, ServiceProductStatusHistory } from "@/types";
import { ProductConfigurationTab } from "@/components/masters/product-tabs/ProductConfigurationTab";
import { ProductAvailabilityTab } from "@/components/masters/product-tabs/ProductAvailabilityTab";
import { ProductScheduleTab } from "@/components/masters/product-tabs/ProductScheduleTab";
import { ProductInclusionExclusionTab } from "@/components/masters/product-tabs/ProductInclusionExclusionTab";
import { ProductItineraryTab } from "@/components/masters/product-tabs/ProductItineraryTab";
import { ProductLocationTab } from "@/components/masters/product-tabs/ProductLocationTab";
import { ProductMediaTab } from "@/components/masters/product-tabs/ProductMediaTab";
import { ProductOptionTab } from "@/components/masters/product-tabs/ProductOptionTab";
import { ProductVariantTab } from "@/components/masters/product-tabs/ProductVariantTab";
import { ProductSupplierLocationTab } from "@/components/masters/product-tabs/ProductSupplierLocationTab";
import { ProductRateTab } from "@/components/masters/product-tabs/ProductRateTab";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{children ?? "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

/** Description fields are saved as HTML from the rich text editor; "<p></p>" counts as empty. */
function isBlankHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

function HtmlContent({ html }: { html: string | null | undefined }) {
  if (isBlankHtml(html)) return null;
  return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html! }} />;
}

function ProductView({ roleDef }: { roleDef: RoleDef }) {
  const { role, serviceProductId } = useParams<{ role: string; serviceProductId: string }>();
  const id = Number(serviceProductId);
  const [product, setProduct] = useState<ServiceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ServiceProductStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const canEdit = can(roleDef, "serviceProduct", "edit");

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid product id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getServiceProduct(id)
      .then((row) => {
        if (!cancelled) setProduct(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ServiceProductsApiError ? err.message : "Failed to load product");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    setLoadingHistory(true);
    listServiceProductStatusHistory(id)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        // status history is supplementary; a failed fetch shouldn't block the page — just leave the list empty.
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading product…</div>;
  }

  if (error || !product) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Package}
          tone="muted"
          heading="Product not found"
          description={error ?? "This product may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/service-product`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={product.serviceProductName}
        description={`${product.serviceProductCode}${product.serviceTypeName ? ` · ${product.serviceTypeName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/service-product`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/service-product/${product.serviceProductId}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">{product.serviceProductCode}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.serviceProductName}</h1>
            {!isBlankHtml(product.shortDescription) && (
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                {product.shortDescription!.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {product.serviceTypeName && <Badge className="bg-white/15 text-white hover:bg-white/20">{product.serviceTypeName}</Badge>}
              {product.classificationName && <Badge className="bg-white/15 text-white hover:bg-white/20">{product.classificationName}</Badge>}
              {product.categoryName && <Badge className="bg-white/15 text-white hover:bg-white/20">{product.categoryName}</Badge>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={product.isActive ? "default" : "secondary"}>{product.isActive ? "active" : "inactive"}</Badge>
            <div className="flex items-center gap-3 text-sm text-white/80">
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  Featured
                </span>
              )}
              {product.isOnlineSellable && <span>Online sellable</span>}
              {product.statusName && <span>{product.statusName}</span>}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "overview")}>
        <div className="rounded-xl border border-border bg-muted/40 p-1.5">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="overview" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <LayoutGrid className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="configuration" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <CalendarCheck className="h-4 w-4" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="inclusionExclusion" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <ListChecks className="h-4 w-4" />
              Inclusion / Exclusion
            </TabsTrigger>
            <TabsTrigger value="itinerary" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Route className="h-4 w-4" />
              Itinerary
            </TabsTrigger>
            <TabsTrigger value="location" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Location
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="option" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <ListTree className="h-4 w-4" />
              Options
            </TabsTrigger>
            <TabsTrigger value="variant" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <GitBranch className="h-4 w-4" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="supplierLocation" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Supplier Locations
            </TabsTrigger>
            <TabsTrigger value="rate" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Rates
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Identity">
              <DetailRow label="Code">{product.serviceProductCode}</DetailRow>
              <DetailRow label="Name">{product.serviceProductName}</DetailRow>
              <DetailRow label="Service type">{product.serviceTypeName}</DetailRow>
              <DetailRow label="Classification">{product.classificationName}</DetailRow>
              <DetailRow label="Category">{product.categoryName}</DetailRow>
              <DetailRow label="Supplier">{product.supplierName}</DetailRow>
              <DetailRow label="Display order">{product.displayOrder}</DetailRow>
            </Section>

            <Section title="Location">
              <DetailRow label="Country">{product.countryName}</DetailRow>
              <DetailRow label="Region">{product.regionName}</DetailRow>
              <DetailRow label="City">{product.cityName}</DetailRow>
            </Section>

            <Section title="Description">
              <DetailRow label="Short description">
                <HtmlContent html={product.shortDescription} />
              </DetailRow>
              <DetailRow label="Full description">
                <HtmlContent html={product.description} />
              </DetailRow>
            </Section>

            <Section title="Commercial">
              <DetailRow label="Status">{product.statusName}</DetailRow>
              <DetailRow label="Online sellable">{product.isOnlineSellable ? "Yes" : "No"}</DetailRow>
              <DetailRow label="Featured">{product.isFeatured ? "Yes" : "No"}</DetailRow>
              <DetailRow label="Company">{product.companyName}</DetailRow>
            </Section>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Status history
              </h2>
              {loadingHistory ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-1.5 rounded-lg border border-border p-3 text-xs">
                  {history.map((h) => (
                    <li key={h.serviceProductStatusHistoryId} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>
                        {h.fromStatusName ?? "—"} → <span className="font-medium text-foreground">{h.toStatusName}</span>
                        {h.remarks ? ` — ${h.remarks}` : ""}
                      </span>
                      <span className="shrink-0">{new Date(h.changedDtTm).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="mt-4">
          <ProductConfigurationTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="availability" className="mt-4">
          <ProductAvailabilityTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ProductScheduleTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="inclusionExclusion" className="mt-4">
          <ProductInclusionExclusionTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="itinerary" className="mt-4">
          <ProductItineraryTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="location" className="mt-4">
          <ProductLocationTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <ProductMediaTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="option" className="mt-4">
          <ProductOptionTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="variant" className="mt-4">
          <ProductVariantTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="supplierLocation" className="mt-4">
          <ProductSupplierLocationTab product={product} roleDef={roleDef} />
        </TabsContent>
        <TabsContent value="rate" className="mt-4">
          <ProductRateTab product={product} roleDef={roleDef} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ServiceProductDetailsPage() {
  return <AccessGate module="serviceProduct">{(roleDef) => <ProductView roleDef={roleDef} />}</AccessGate>;
}
