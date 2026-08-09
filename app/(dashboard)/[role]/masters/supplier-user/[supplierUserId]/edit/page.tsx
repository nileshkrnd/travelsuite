"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SupplierUserForm } from "@/components/masters/SupplierUserForm";
import { getSupplierUser, SupplierUsersApiError } from "@/lib/services/supplier-users.service";
import type { SupplierUser } from "@/types";

function EditSupplierUser() {
  const { role, supplierUserId } = useParams<{ role: string; supplierUserId: string }>();
  const [entry, setEntry] = useState<SupplierUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(supplierUserId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSupplierUser(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof SupplierUsersApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierUserId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={UserPlus}
          tone="muted"
          heading="Supplier user not found"
          description="This user may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/supplier-user`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  const name = `${entry.firstName} ${entry.lastName}`.trim();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify supplier user"
        description={`Update contact and access for ${name}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier-user/${entry.supplierUserKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SupplierUserForm entry={entry} />
    </div>
  );
}

export default function EditSupplierUserPage() {
  return (
    <AccessGate module="supplierUser" action="edit">
      {() => <EditSupplierUser />}
    </AccessGate>
  );
}
