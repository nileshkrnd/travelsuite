"use client";

import Link from "next/link";
import { ArrowRight, Building, Coins, Globe, Landmark, MapPinned } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RoleDef, User } from "@/types";

const SETTINGS = [
  {
    key: "tenant",
    title: "Tenant registration",
    description: "Create and manage holding tenants on the platform.",
    href: "masters/tenant",
    icon: Building,
  },
  {
    key: "country",
    title: "Country",
    description: "Global country master used when registering tenants.",
    href: "masters/country",
    icon: Globe,
  },
  {
    key: "city",
    title: "City",
    description: "Global city master linked to countries only.",
    href: "masters/city",
    icon: MapPinned,
  },
  {
    key: "currency",
    title: "Currency",
    description: "Global currency master shared by every tenant.",
    href: "masters/currency",
    icon: Coins,
  },
  {
    key: "region",
    title: "Region",
    description: "Global region master (not tenant or company scoped).",
    href: "masters/region",
    icon: Landmark,
  },
] as const;

/** Super Admin platform home — common settings only (no specific tenant selected). */
export function SuperAdminPlatformDashboard({
  user,
  roleDef,
}: {
  user: User;
  roleDef: RoleDef;
}) {
  const base = `/${roleDef.slug}`;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Super Admin · platform mode. Configure common tenant settings, or select a tenant workspace from the top bar."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/select-tenant" />}>
            Select a tenant
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={`${base}/${item.href}`} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-semibold tracking-tight">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
