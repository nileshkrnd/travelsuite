"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Pencil, CheckCircle2, CircleDashed } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSubscriptionModule,
  SubscriptionModulesApiError,
} from "@/lib/services/subscription-modules.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModule } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function ModuleView({ roleDef }: { roleDef: RoleDef }) {
  const { role, subscriptionModuleId } = useParams<{
    role: string;
    subscriptionModuleId: string;
  }>();
  const [module, setModule] = useState<SubscriptionModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "subscriptionModule", "edit");
  const id = Number(subscriptionModuleId);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid module id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSubscriptionModule(id)
      .then((row) => {
        if (!cancelled) setModule(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof SubscriptionModulesApiError ? err.message : "Failed to load");
          setModule(null);
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
    return <div className="p-6 text-sm text-muted-foreground">Loading module…</div>;
  }

  if (!module) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Layers}
          tone="muted"
          heading="Module not found"
          description={error ?? "This module may have been removed."}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module`} />}
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
        title={module.subscriptionModuleName}
        description="Subscription module details."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/${role}/masters/subscription-module/${module.subscriptionModuleId}/edit`}
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
            <DetailRow label="Subscription Module Name">{module.subscriptionModuleName}</DetailRow>
            <DetailRow label="Subscription Product">{module.subscriptionProductName ?? "—"}</DetailRow>
            <DetailRow label="Description">{module.description || "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={module.isActive ? "default" : "secondary"} className="gap-1">
                {module.isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {module.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(module.createdDtTm).toLocaleString()}</DetailRow>
            <DetailRow label="Modified">
              {module.modifiedDtTm ? new Date(module.modifiedDtTm).toLocaleString() : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionModuleViewPage() {
  return (
    <AccessGate module="subscriptionModule">{(roleDef) => <ModuleView roleDef={roleDef} />}</AccessGate>
  );
}
