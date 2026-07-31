"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListTree } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleMenuForm } from "@/components/masters/SubscriptionModuleMenuForm";
import {
  getSubscriptionModuleMenu,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import type { SubscriptionModuleMenu } from "@/types";

function EditMenu() {
  const { role, subscriptionModuleMenuId } = useParams<{
    role: string;
    subscriptionModuleMenuId: string;
  }>();
  const [menu, setMenu] = useState<SubscriptionModuleMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const id = Number(subscriptionModuleMenuId);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid menu id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSubscriptionModuleMenu(id)
      .then((row) => {
        if (!cancelled) setMenu(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof SubscriptionModuleMenusApiError ? err.message : "Failed to load");
          setMenu(null);
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
    return <div className="p-6 text-sm text-muted-foreground">Loading module menu…</div>;
  }

  if (!menu) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ListTree}
          tone="muted"
          heading="Module menu not found"
          description={error ?? "This menu may have been removed."}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-menu`} />}
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
        title="Modify module menu"
        description={menu.menuName}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/${role}/masters/subscription-module-menu/${menu.subscriptionModuleMenuId}`}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <SubscriptionModuleMenuForm menu={menu} />
    </div>
  );
}

export default function EditSubscriptionModuleMenuPage() {
  return (
    <AccessGate module="subscriptionModuleMenu" action="edit">
      {() => <EditMenu />}
    </AccessGate>
  );
}
