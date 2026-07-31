"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SubscriptionProductForm } from "@/components/masters/SubscriptionProductForm";
import {
  getSubscriptionProduct,
  SubscriptionProductsApiError,
} from "@/lib/services/subscription-products.service";
import type { SubscriptionProduct } from "@/types";

function EditProduct() {
  const { role, subscriptionProductId } = useParams<{
    role: string;
    subscriptionProductId: string;
  }>();
  const [product, setProduct] = useState<SubscriptionProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const id = Number(subscriptionProductId);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid product id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSubscriptionProduct(id)
      .then((row) => {
        if (!cancelled) setProduct(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof SubscriptionProductsApiError ? err.message : "Failed to load");
          setProduct(null);
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

  if (!product) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Package}
          tone="muted"
          heading="Product not found"
          description={error ?? "This product may have been removed."}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-product`} />}
            >
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
        title="Modify subscription product"
        description={product.subscriptionProductName}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/masters/subscription-product/${product.subscriptionProductId}`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SubscriptionProductForm product={product} />
    </div>
  );
}

export default function EditSubscriptionProductPage() {
  return (
    <AccessGate module="subscriptionProduct" action="edit">
      {() => <EditProduct />}
    </AccessGate>
  );
}
