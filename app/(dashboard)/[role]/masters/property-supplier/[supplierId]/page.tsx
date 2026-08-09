"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store, Pencil, Star } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupplierPropertyGrant, PropertySuppliersApiError } from "@/lib/services/property-suppliers.service";
import { can } from "@/config/permissions";
import type { RoleDef, SupplierPropertyGrant } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function PropertySupplierView({ roleDef }: { roleDef: RoleDef }) {
  const { role, supplierId } = useParams<{ role: string; supplierId: string }>();
  const id = Number(supplierId);
  const [grant, setGrant] = useState<SupplierPropertyGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "propertySupplier", "edit");

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
    <div className="space-y-6 p-6">
      <PageHeader
        title={grant.supplierName ?? `Supplier ${grant.supplierId}`}
        description="Property links for this supplier."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/property-supplier`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/masters/property-supplier/${grant.supplierId}/edit`} />}
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-2xl">
        <CardContent>
          <dl>
            <DetailRow label="Supplier">{grant.supplierName ?? grant.supplierId}</DetailRow>
            <DetailRow label="Properties">
              <div className="flex flex-wrap gap-1.5">
                {grant.properties.map((p) => (
                  <Badge key={p.propertyId} variant="outline">
                    {p.propertyName || p.propertyCode}
                  </Badge>
                ))}
              </div>
            </DetailRow>
            <DetailRow label="Primary supplier">
              {grant.isPrimary ? (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />
                  Yes, for every listed property
                </Badge>
              ) : (
                "No"
              )}
            </DetailRow>
            <DetailRow label="Valid">
              {[grant.validFrom, grant.validTo].filter(Boolean).join(" → ") || "No expiry"}
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={grant.isActive ? "default" : "secondary"}>
                {grant.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Linked">{new Date(grant.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PropertySupplierViewPage() {
  return <AccessGate module="propertySupplier">{(roleDef) => <PropertySupplierView roleDef={roleDef} />}</AccessGate>;
}
