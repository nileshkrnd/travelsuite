"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Pencil, CheckCircle2, CircleDashed } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSubscriptionProduct,
  SubscriptionProductsApiError,
} from "@/lib/services/subscription-products.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionProduct } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function ProductView({ roleDef }: { roleDef: RoleDef }) {
  const { role, subscriptionProductId } = useParams<{
    role: string;
    subscriptionProductId: string;
  }>();
  const [product, setProduct] = useState<SubscriptionProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "subscriptionProduct", "edit");
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
        title={product.subscriptionProductName}
        description="Subscription product details."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-product`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/${role}/masters/subscription-product/${product.subscriptionProductId}/edit`}
                  />
                }
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-2">
          <dl>
            <DetailRow label="Product name">{product.subscriptionProductName}</DetailRow>
            <DetailRow label="Description">{product.description || "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={product.isActive ? "default" : "secondary"} className="gap-1">
                {product.isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {product.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(product.createdDtTm).toLocaleString()}</DetailRow>
            <DetailRow label="Modified">
              {product.modifiedDtTm ? new Date(product.modifiedDtTm).toLocaleString() : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionProductViewPage() {
  return (
    <AccessGate module="subscriptionProduct">{(roleDef) => <ProductView roleDef={roleDef} />}</AccessGate>
  );
}
