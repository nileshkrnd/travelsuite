"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store, Pencil } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupplier, SuppliersApiError } from "@/lib/services/suppliers.service";
import { can } from "@/config/permissions";
import type { RoleDef, Supplier } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function SupplierView({ roleDef }: { roleDef: RoleDef }) {
  const { role, supplierId } = useParams<{ role: string; supplierId: string }>();
  const id = Number(supplierId);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "supplier", "edit");

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
    <div className="space-y-6 p-6">
      <PageHeader
        title={supplier.name}
        description="Supplier details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/supplier`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/masters/supplier/${supplier.supplierKey}/edit`} />}
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
            <DetailRow label="Supplier code">
              <span className="font-mono text-xs">{supplier.code}</span>
            </DetailRow>
            <DetailRow label="Trading name">{supplier.name}</DetailRow>
            <DetailRow label="Legal name">{supplier.legalName}</DetailRow>
            <DetailRow label="Supplier type">{supplier.supplierTypeName ?? supplier.supplierTypeId}</DetailRow>
            <DetailRow label="Company">{supplier.companyName ?? supplier.companyKey}</DetailRow>
            <DetailRow label="Registration no.">{supplier.registrationNumber || "—"}</DetailRow>
            <DetailRow label="Tax / VAT no.">{supplier.taxVatNumber || "—"}</DetailRow>
            <DetailRow label="Address">{supplier.address}</DetailRow>
            <DetailRow label="Country / State / City">
              {[supplier.countryName ?? supplier.countryId, supplier.stateName, supplier.cityName ?? supplier.cityId]
                .filter(Boolean)
                .join(" / ")}
            </DetailRow>
            <DetailRow label="Postal code">{supplier.postalCode || "—"}</DetailRow>
            <DetailRow label="Website">{supplier.website || "—"}</DetailRow>
            <DetailRow label="Currency">{supplier.currencyCode ?? supplier.currencyId}</DetailRow>
            <DetailRow label="Extranet access">
              <Badge variant={supplier.requiresExtranetAccess ? "default" : "secondary"}>
                {supplier.requiresExtranetAccess ? "Yes" : "No"}
              </Badge>
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(supplier.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplierViewPage() {
  return <AccessGate module="supplier">{(roleDef) => <SupplierView roleDef={roleDef} />}</AccessGate>;
}
