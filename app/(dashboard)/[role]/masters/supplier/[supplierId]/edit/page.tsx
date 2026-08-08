"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/masters/SupplierForm";
import { getSupplier, SuppliersApiError } from "@/lib/services/suppliers.service";
import type { Supplier } from "@/types";

function EditSupplier() {
  const { role, supplierId } = useParams<{ role: string; supplierId: string }>();
  const id = Number(supplierId);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid supplier id");
      return;
    }
    let cancelled = false;
    getSupplier(id)
      .then((row) => {
        if (!cancelled) setSupplier(row);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof SuppliersApiError ? err.message : "Failed to load supplier");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading supplier…</div>;
  }

  if (error || !supplier) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          tone="muted"
          heading="Supplier not found"
          description={error ?? "This supplier may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier`} />}>
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
        title="Modify supplier"
        description={`Update ${supplier.name}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier/${supplier.supplierKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SupplierForm supplier={supplier} />
    </div>
  );
}

export default function EditSupplierPage() {
  return (
    <AccessGate module="supplier" action="edit">
      {() => <EditSupplier />}
    </AccessGate>
  );
}
