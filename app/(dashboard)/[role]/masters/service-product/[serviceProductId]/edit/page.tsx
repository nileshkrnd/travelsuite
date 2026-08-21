"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ServiceProductForm } from "@/components/masters/ServiceProductForm";
import { getServiceProduct, ServiceProductsApiError } from "@/lib/services/service-products.service";
import type { RoleDef, ServiceProduct } from "@/types";

function EditProduct({ roleDef }: { roleDef: RoleDef }) {
  const { role, serviceProductId } = useParams<{ role: string; serviceProductId: string }>();
  const id = Number(serviceProductId);
  const [product, setProduct] = useState<ServiceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid product id");
      return;
    }
    let cancelled = false;
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify product"
        description={`Update ${product.serviceProductName}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/service-product/${product.serviceProductId}`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <ServiceProductForm serviceProduct={product} roleDef={roleDef} />
    </div>
  );
}

export default function EditServiceProductPage() {
  return (
    <AccessGate module="serviceProduct" action="edit">
      {(roleDef) => <EditProduct roleDef={roleDef} />}
    </AccessGate>
  );
}
