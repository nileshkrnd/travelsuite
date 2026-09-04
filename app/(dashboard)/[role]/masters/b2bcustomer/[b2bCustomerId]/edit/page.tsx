"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { B2BCustomerForm, B2BCustomerHeaderActions, b2bCustomerPaths } from "@/components/masters/B2BCustomerForm";
import { getB2BCustomer, B2BCustomersApiError } from "@/lib/services/b2b-customers.service";
import { can } from "@/config/permissions";
import type { B2BCustomer, RoleDef } from "@/types";

function EditB2BCustomer({ roleDef }: { roleDef: RoleDef }) {
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title={`Edit ${row.b2bCustomerName}`}
        description="Update this B2B customer's account details."
        actions={<B2BCustomerHeaderActions role={role} id={row.b2bCustomerId} current="edit" canEdit={canEdit} />}
      />
      <B2BCustomerForm roleDef={roleDef} customer={row} />
    </div>
  );
}

export default function EditB2BCustomerPage() {
  return (
    <AccessGate module="b2bCustomer" action="edit">
      {(roleDef) => <EditB2BCustomer roleDef={roleDef} />}
    </AccessGate>
  );
}
