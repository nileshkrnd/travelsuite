"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, Layers } from "lucide-react";
import { findMenuItem, type ModuleKey } from "@/config/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ICONS } from "@/lib/icon-registry";
import { Card, CardContent } from "@/components/ui/card";

interface ModulePrototypePageProps {
  moduleKey: ModuleKey;
  title: string;
  groupLabel?: string;
  description?: string;
  /** Menu leaf path without role prefix (kept for link compatibility). */
  listPath?: string;
}

/**
 * Placeholder workspace for menu items that do not yet have a dedicated screen.
 * Intentionally has no mock/demo KPIs or sample tables.
 */
export function ModulePrototypePage({
  moduleKey,
  title,
  groupLabel,
  description,
}: ModulePrototypePageProps) {
  const { role } = useParams<{ role: string }>();
  const menu = findMenuItem(moduleKey);
  const Icon = (menu ? ICONS[menu.icon] : undefined) ?? Layers;

  return (
    <div className="space-y-6 p-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link
          href={`/${role}/dashboard`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <span aria-hidden>/</span>
        <span>{groupLabel ?? "Modules"}</span>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>

      <PageHeader title={title} description={description ?? `${title} workspace.`} />

      <Card>
        <CardContent className="py-10">
          <EmptyState
            icon={Icon}
            tone="muted"
            heading={`${title} is ready in the menu`}
            description="This module is assigned and visible, but its full working screen is not built yet. Masters such as Country, City, Company, and Subscription already use their live pages."
            size="compact"
          />
        </CardContent>
      </Card>
    </div>
  );
}
