"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListTree, Pencil, CheckCircle2, CircleDashed, Layers } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSubscriptionModuleMenu,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { can } from "@/config/permissions";
import { ICONS } from "@/lib/icon-registry";
import type { RoleDef, SubscriptionModuleMenu } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function MenuView({ roleDef }: { roleDef: RoleDef }) {
  const { role, subscriptionModuleMenuId } = useParams<{
    role: string;
    subscriptionModuleMenuId: string;
  }>();
  const [menu, setMenu] = useState<SubscriptionModuleMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "subscriptionModuleMenu", "edit");
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
        title={menu.menuName}
        description="Subscription module menu details."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-menu`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/${role}/masters/subscription-module-menu/${menu.subscriptionModuleMenuId}/edit`}
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
            <DetailRow label="Menu name">{menu.menuName}</DetailRow>
            <DetailRow label="Menu URL">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{menu.menuUrl}</code>
            </DetailRow>
            <DetailRow label="Icon">
              <span className="inline-flex items-center gap-2">
                {(() => {
                  const Ic = ICONS[menu.menuIcon] ?? Layers;
                  return <Ic className="h-4 w-4" />;
                })()}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{menu.menuIcon}</code>
              </span>
            </DetailRow>
            <DetailRow label="Parent menu">{menu.parentMenuName ?? "— (top-level)"}</DetailRow>
            <DetailRow label="Sort order">{menu.sortOrder}</DetailRow>
            <DetailRow label="Subscription Module">{menu.subscriptionModuleName ?? "—"}</DetailRow>
            <DetailRow label="Subscription Product">{menu.subscriptionProductName ?? "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={menu.isActive ? "default" : "secondary"} className="gap-1">
                {menu.isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {menu.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(menu.createdDtTm).toLocaleString()}</DetailRow>
            <DetailRow label="Modified">
              {menu.modifiedDtTm ? new Date(menu.modifiedDtTm).toLocaleString() : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionModuleMenuViewPage() {
  return (
    <AccessGate module="subscriptionModuleMenu">
      {(roleDef) => <MenuView roleDef={roleDef} />}
    </AccessGate>
  );
}
