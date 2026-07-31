"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleAccessForm } from "@/components/masters/SubscriptionModuleAccessForm";
import {
  getSubscriptionModuleAccess,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import type { SubscriptionModuleAccess } from "@/types";

function EditAccess() {
  const { role, subscriptionModuleAccessId } = useParams<{
    role: string;
    subscriptionModuleAccessId: string;
  }>();
  const [access, setAccess] = useState<SubscriptionModuleAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        title="Modify module access"
        description={
          access.subscriptionModuleName && access.tenantName
            ? `${access.subscriptionModuleName} → ${access.tenantName}`
            : "Update tenant module grant"
        }
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/masters/subscription-module-access/${access.subscriptionModuleAccessId}`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SubscriptionModuleAccessForm access={access} />
    </div>
  );
}

export default function EditSubscriptionModuleAccessPage() {
  return (
    <AccessGate module="subscriptionModuleAccess" action="edit">
      {() => <EditAccess />}
    </AccessGate>
  );
}
