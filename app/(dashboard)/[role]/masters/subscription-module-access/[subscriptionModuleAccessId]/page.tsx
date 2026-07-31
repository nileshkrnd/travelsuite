"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Pencil, CheckCircle2, CircleDashed } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSubscriptionModuleAccess,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModuleAccess } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function AccessView({ roleDef }: { roleDef: RoleDef }) {
  const { role, subscriptionModuleAccessId } = useParams<{
    role: string;
    subscriptionModuleAccessId: string;
  }>();
  const [access, setAccess] = useState<SubscriptionModuleAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "subscriptionModuleAccess", "edit");
  const id = Number(subscriptionModuleAccessId);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid access id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSubscriptionModuleAccess(id)
      .then((row) => {
        if (!cancelled) setAccess(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof SubscriptionModuleAccessApiError ? err.message : "Failed to load"
          );
          setAccess(null);
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
    return <div className="p-6 text-sm text-muted-foreground">Loading access grant…</div>;
  }

  if (!access) {
    return (
      <div className="p-6">
        <EmptyState
          icon={KeyRound}
          tone="muted"
          heading="Access grant not found"
          description={error ?? "This grant may have been removed."}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-access`} />}
            >
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
        title={access.subscriptionModuleName ?? "Module access"}
        description="Subscription module access details."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-access`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/${role}/masters/subscription-module-access/${access.subscriptionModuleAccessId}/edit`}
                  />
                }
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-2">
          <dl>
            <DetailRow label="Tenant">
              {access.tenantName ?? "—"}
              {access.tenantCode ? ` (${access.tenantCode})` : ""}
            </DetailRow>
            <DetailRow label="Subscription Module">{access.subscriptionModuleName ?? "—"}</DetailRow>
            <DetailRow label="Subscription Product">{access.subscriptionProductName ?? "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={access.isActive ? "default" : "secondary"} className="gap-1">
                {access.isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {access.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(access.createdDtTm).toLocaleString()}</DetailRow>
            <DetailRow label="Modified">
              {access.modifiedDtTm ? new Date(access.modifiedDtTm).toLocaleString() : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionModuleAccessViewPage() {
  return (
    <AccessGate module="subscriptionModuleAccess">
      {(roleDef) => <AccessView roleDef={roleDef} />}
    </AccessGate>
  );
}
