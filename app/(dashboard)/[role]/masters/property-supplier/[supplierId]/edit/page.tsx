"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SupplierPropertyGrantForm } from "@/components/masters/SupplierPropertyGrantForm";
import { getSupplierPropertyGrant, PropertySuppliersApiError } from "@/lib/services/property-suppliers.service";
import type { SupplierPropertyGrant } from "@/types";

function EditPropertySupplier() {
  const { role, supplierId } = useParams<{ role: string; supplierId: string }>();
  const id = Number(supplierId);
  const [grant, setGrant] = useState<SupplierPropertyGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid supplier id");
      return;
    }
    let cancelled = false;
    getSupplierPropertyGrant(id)
      .then((row) => {
        if (!cancelled) setGrant(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof PropertySuppliersApiError ? err.message : "Failed to load property links");
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
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (error || !grant) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          tone="muted"
          heading="Property links not found"
          description={error ?? "This supplier may have no property links."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/property-supplier`} />}>
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
        title="Modify property links"
        description={`Update linked properties for ${grant.supplierName ?? "this supplier"}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/property-supplier/${grant.supplierId}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SupplierPropertyGrantForm grant={grant} />
    </div>
  );
}

export default function EditPropertySupplierPage() {
  return (
    <AccessGate module="propertySupplier" action="edit">
      {() => <EditPropertySupplier />}
    </AccessGate>
  );
}
