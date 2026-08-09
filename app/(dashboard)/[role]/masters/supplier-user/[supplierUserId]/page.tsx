"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Power, PowerOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session.store";
import {
  getSupplierUser,
  setSupplierUserActive,
  SupplierUsersApiError,
} from "@/lib/services/supplier-users.service";
import { can } from "@/config/permissions";
import type { RoleDef, SupplierUser } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function SupplierUserView({ roleDef }: { roleDef: RoleDef }) {
  const { role, supplierUserId } = useParams<{ role: string; supplierUserId: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entry, setEntry] = useState<SupplierUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "supplierUser", "edit");

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

  async function toggleStatus() {
    if (!entry || !actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setSupplierUserActive(entry.supplierUserKey, !entry.isActive, actorKey);
      setEntry(saved);
      toast.success(saved.isActive ? "Supplier user activated" : "Supplier user deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not update status");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading supplier user…</div>;
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
  const phone =
    [entry.dialCountryCode, entry.mobileNumber].filter(Boolean).join(" ").trim() || "—";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={name}
        description="Supplier portal user details."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/supplier-user`} />}
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
                render={<Link href={`/${role}/masters/supplier-user/${entry.supplierUserKey}/edit`} />}
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
            <p className="text-base font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{entry.email}</p>
          </div>
          <dl>
            <DetailRow label="Supplier">{entry.supplierName ?? `Supplier ${entry.supplierId}`}</DetailRow>
            <DetailRow label="Email">{entry.email}</DetailRow>
            <DetailRow label="Phone">{phone}</DetailRow>
            <DetailRow label="Access role">{entry.accessRoleName ?? "—"}</DetailRow>
            <DetailRow label="Login user ID">{entry.userKey}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={entry.isActive ? "default" : "outline"}>
                {entry.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(entry.createdAt).toLocaleString()}</DetailRow>
            <DetailRow label="Updated">
              {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplierUserViewPage() {
  return (
    <AccessGate module="supplierUser">
      {(roleDef) => <SupplierUserView roleDef={roleDef} />}
    </AccessGate>
  );
}
