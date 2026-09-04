"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { B2BCustomerHeaderActions, b2bCustomerPaths } from "@/components/masters/B2BCustomerForm";
import { getB2BCustomer, B2BCustomersApiError } from "@/lib/services/b2b-customers.service";
import { can } from "@/config/permissions";
import type { B2BCustomer, RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function B2BCustomerView({ roleDef }: { roleDef: RoleDef }) {
  const { role, b2bCustomerId } = useParams<{ role: string; b2bCustomerId: string }>();
  const id = Number(b2bCustomerId);
  const [row, setRow] = useState<B2BCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "b2bCustomer", "edit");

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid customer id");
      return;
    }
    let cancelled = false;
    getB2BCustomer(id)
      .then((customer) => {
        if (!cancelled) setRow(customer);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof B2BCustomersApiError ? err.message : "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading customer…</div>;
  }

  if (error || !row) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Landmark}
          tone="muted"
          heading="Customer not found"
          description={error ?? "This customer may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={b2bCustomerPaths(role).list} />}>
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
        title={row.b2bCustomerName}
        description="B2B customer overview."
        actions={<B2BCustomerHeaderActions role={role} id={row.b2bCustomerId} current="view" canEdit={canEdit} />}
      />

      <Card className="max-w-2xl">
        <CardContent>
          <dl>
            <DetailRow label="Code">
              <span className="font-mono text-xs">{row.b2bCustomerCode}</span>
            </DetailRow>
            <DetailRow label="Name">{row.b2bCustomerName}</DetailRow>
            <DetailRow label="Type">{row.customerTypeName ?? "—"}</DetailRow>
            <DetailRow label="Category">{row.categoryName ?? "—"}</DetailRow>
            <DetailRow label="Parent customer">{row.parentB2bCustomerName ?? "—"}</DetailRow>
            <DetailRow label="Registration number">{row.registrationNumber || "—"}</DetailRow>
            <DetailRow label="Tax registration number">{row.taxRegistrationNumber || "—"}</DetailRow>
            <DetailRow label="Country">{row.countryName ?? "—"}</DetailRow>
            <DetailRow label="Currency">{row.currencyCode ?? "—"}</DetailRow>
            <DetailRow label="Payment term">{row.paymentTermName ?? "—"}</DetailRow>
            <DetailRow label="Credit limit">{row.creditLimit != null ? row.creditLimit : "—"}</DetailRow>
            <DetailRow label="Credit days">{row.creditDays != null ? row.creditDays : "—"}</DetailRow>
            <DetailRow label="Account manager">{row.accountManagerName ?? "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={row.isActive ? "default" : "secondary"}>
                {row.statusName ?? (row.isActive ? "active" : "inactive")}
              </Badge>
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function B2BCustomerViewPage() {
  return <AccessGate module="b2bCustomer">{(roleDef) => <B2BCustomerView roleDef={roleDef} />}</AccessGate>;
}
