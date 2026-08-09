"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Power, PowerOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSupplierPropertyAccess,
  setSupplierPropertyAccessActive,
  SupplierPropertyAccessApiError,
} from "@/lib/services/supplier-property-access.service";
import { can } from "@/config/permissions";
import type { RoleDef, SupplierPropertyAccess } from "@/types";

const FLAGS = [
  { key: "canView", label: "View rates" },
  { key: "canCreateRate", label: "Create rate" },
  { key: "canEditRate", label: "Edit rate" },
  { key: "canSubmitRate", label: "Submit rate" },
  { key: "canApproveRate", label: "Approve rate" },
] as const;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function SupplierPropertyAccessView({ roleDef }: { roleDef: RoleDef }) {
  const { role, supplierPropertyAccessId } = useParams<{ role: string; supplierPropertyAccessId: string }>();
  const [entry, setEntry] = useState<SupplierPropertyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "supplierPropertyAccess", "edit");

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

  async function toggleStatus() {
    if (!entry) return;
    try {
      const saved = await setSupplierPropertyAccessActive(entry.supplierPropertyAccessKey, !entry.isActive);
      setEntry(saved);
      toast.success(saved.isActive ? "Access activated" : "Access deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not update status");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading access grant…</div>;
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
    <div className="space-y-6 p-6">
      <PageHeader
        title={linkLabel}
        description="Supplier rate access grant details."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/supplier-property-access`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => void toggleStatus()}>
                {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {entry.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/masters/supplier-property-access/${entry.supplierPropertyAccessKey}/edit`} />}
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
          <div className="mb-4">
            <p className="text-base font-semibold text-foreground">{linkLabel}</p>
            <p className="text-sm text-muted-foreground">{entry.userName ?? `User ${entry.userKey}`}</p>
          </div>
          <dl>
            <DetailRow label="Property">{entry.propertyName ?? "—"}</DetailRow>
            <DetailRow label="Supplier">{entry.supplierName ?? "—"}</DetailRow>
            <DetailRow label="Supplier user">{entry.userName ?? `User ${entry.userKey}`}</DetailRow>
            <DetailRow label="Permissions">
              <div className="flex flex-wrap gap-1">
                {FLAGS.filter((f) => entry[f.key]).map((f) => (
                  <Badge key={f.key} variant="outline">
                    {f.label}
                  </Badge>
                ))}
                {FLAGS.every((f) => !entry[f.key]) && <span className="text-muted-foreground">None</span>}
              </div>
            </DetailRow>
            <DetailRow label="Valid from">{entry.validFrom ?? "—"}</DetailRow>
            <DetailRow label="Valid to">{entry.validTo ?? "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={entry.isActive ? "default" : "outline"}>
                {entry.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(entry.createdAt).toLocaleString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplierPropertyAccessViewPage() {
  return (
    <AccessGate module="supplierPropertyAccess">
      {(roleDef) => <SupplierPropertyAccessView roleDef={roleDef} />}
    </AccessGate>
  );
}
