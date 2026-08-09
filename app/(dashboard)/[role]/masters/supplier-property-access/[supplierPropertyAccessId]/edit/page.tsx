"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SupplierPropertyAccessForm } from "@/components/masters/SupplierPropertyAccessForm";
import {
  getSupplierPropertyAccess,
  SupplierPropertyAccessApiError,
} from "@/lib/services/supplier-property-access.service";
import type { SupplierPropertyAccess } from "@/types";

function EditSupplierPropertyAccess() {
  const { role, supplierPropertyAccessId } = useParams<{ role: string; supplierPropertyAccessId: string }>();
  const [entry, setEntry] = useState<SupplierPropertyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(supplierPropertyAccessId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSupplierPropertyAccess(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof SupplierPropertyAccessApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierPropertyAccessId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldCheck}
          tone="muted"
          heading="Access grant not found"
          description="This grant may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier-property-access`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  const linkLabel = `${entry.propertyName ?? "Property"} — ${entry.supplierName ?? "Supplier"}`;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify rate access"
        description={`Update permissions and validity for ${linkLabel}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier-property-access/${entry.supplierPropertyAccessKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SupplierPropertyAccessForm entry={entry} />
    </div>
  );
}

export default function EditSupplierPropertyAccessPage() {
  return (
    <AccessGate module="supplierPropertyAccess" action="edit">
      {() => <EditSupplierPropertyAccess />}
    </AccessGate>
  );
}
