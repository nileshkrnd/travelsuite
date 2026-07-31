"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleForm } from "@/components/masters/SubscriptionModuleForm";
import {
  getSubscriptionModule,
  SubscriptionModulesApiError,
} from "@/lib/services/subscription-modules.service";
import type { SubscriptionModule } from "@/types";

function EditModule() {
  const { role, subscriptionModuleId } = useParams<{
    role: string;
    subscriptionModuleId: string;
  }>();
  const [module, setModule] = useState<SubscriptionModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        title="Modify subscription module"
        description={module.subscriptionModuleName}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/${role}/masters/subscription-module/${module.subscriptionModuleId}`} />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SubscriptionModuleForm module={module} />
    </div>
  );
}

export default function EditSubscriptionModulePage() {
  return (
    <AccessGate module="subscriptionModule" action="edit">
      {() => <EditModule />}
    </AccessGate>
  );
}
