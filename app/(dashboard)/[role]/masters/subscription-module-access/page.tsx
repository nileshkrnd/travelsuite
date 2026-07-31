"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  KeyRound,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Building2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listTenants } from "@/lib/services/tenants.service";
import {
  listSubscriptionModuleAccess,
  setSubscriptionModuleAccessActive,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import { can } from "@/config/permissions";
import { cn } from "@/lib/utils";
import type { RoleDef, SubscriptionModuleAccess, Tenant } from "@/types";

type TenantAccessGroup = {
  tenantId: number;
  tenantName: string;
  tenantCode?: string;
  active: SubscriptionModuleAccess[];
  inactive: SubscriptionModuleAccess[];
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleChip({
  row,
  role,
  canEdit,
  onToggleStatus,
}: {
  row: SubscriptionModuleAccess;
  role: string;
  canEdit: boolean;
  onToggleStatus: (row: SubscriptionModuleAccess) => void;
}) {
  const detailHref = `/${role}/masters/subscription-module-access/${row.subscriptionModuleAccessId}`;
  const editHref = `${detailHref}/edit`;

  return (
    <div
      className={cn(
        "group flex min-w-0 items-start justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors",
        row.isActive
          ? "border-border/70 bg-background hover:border-primary/30 hover:bg-primary/[0.03]"
          : "border-dashed border-border/60 bg-muted/30 hover:bg-muted/50"
      )}
    >
      <Link href={detailHref} className="min-w-0 flex-1 outline-none">
        <p className="truncate text-sm font-medium text-foreground">
          {row.subscriptionModuleName ?? `Module #${row.subscriptionModuleId}`}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.subscriptionProductName ?? "—"}
        </p>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="shrink-0 opacity-70 group-hover:opacity-100" />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={detailHref} />}>
            <Eye className="h-4 w-4" />
            View
          </DropdownMenuItem>
          {canEdit && (
            <>
              <DropdownMenuItem render={<Link href={editHref} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                {row.isActive ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {row.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ModuleSection({
  title,
  icon: Icon,
  rows,
  emptyLabel,
  role,
  canEdit,
  onToggleStatus,
  muted,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: SubscriptionModuleAccess[];
  emptyLabel: string;
  role: string;
  canEdit: boolean;
  onToggleStatus: (row: SubscriptionModuleAccess) => void;
  muted?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon
          className={cn("h-3.5 w-3.5", muted ? "text-muted-foreground" : "text-emerald-600")}
        />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        <Badge variant={muted ? "secondary" : "default"} className="tabular-nums">
          {rows.length}
        </Badge>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <ModuleChip
              key={row.subscriptionModuleAccessId}
              row={row}
              role={role}
              canEdit={canEdit}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccessList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<SubscriptionModuleAccess[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const canCreate = can(roleDef, "subscriptionModuleAccess", "create");
  const canEdit = can(roleDef, "subscriptionModuleAccess", "edit");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [accessRows, tenantRows] = await Promise.all([
        listSubscriptionModuleAccess(),
        listTenants(),
      ]);
      setRows(accessRows);
      setTenants(tenantRows);
    } catch (err) {
      setError(err instanceof SubscriptionModuleAccessApiError ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const tenantGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = rows;
    if (tenantFilter !== "all") {
      const tid = Number(tenantFilter);
      filtered = filtered.filter((r) => r.tenantId === tid);
    }
    if (term) {
      filtered = filtered.filter(
        (r) =>
          (r.tenantName ?? "").toLowerCase().includes(term) ||
          (r.tenantCode ?? "").toLowerCase().includes(term) ||
          (r.subscriptionModuleName ?? "").toLowerCase().includes(term) ||
          (r.subscriptionProductName ?? "").toLowerCase().includes(term)
      );
    }

    const map = new Map<number, TenantAccessGroup>();
    for (const row of filtered) {
      const existing = map.get(row.tenantId);
      if (!existing) {
        map.set(row.tenantId, {
          tenantId: row.tenantId,
          tenantName: row.tenantName ?? `Tenant #${row.tenantId}`,
          tenantCode: row.tenantCode,
          active: row.isActive ? [row] : [],
          inactive: row.isActive ? [] : [row],
        });
      } else if (row.isActive) {
        existing.active.push(row);
      } else {
        existing.inactive.push(row);
      }
    }

    const sortModules = (list: SubscriptionModuleAccess[]) =>
      [...list].sort((a, b) => {
        const byProduct = (a.subscriptionProductName ?? "").localeCompare(
          b.subscriptionProductName ?? ""
        );
        if (byProduct !== 0) return byProduct;
        return (a.subscriptionModuleName ?? "").localeCompare(b.subscriptionModuleName ?? "");
      });

    return [...map.values()]
      .map((g) => ({
        ...g,
        active: sortModules(g.active),
        inactive: sortModules(g.inactive),
      }))
      .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [rows, search, tenantFilter]);

  const activeCount = rows.filter((r) => r.isActive).length;
  const tenantCount = new Set(rows.map((r) => r.tenantId)).size;

  async function toggleStatus(row: SubscriptionModuleAccess) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setSubscriptionModuleAccessActive(
        row.subscriptionModuleAccessId,
        !row.isActive,
        actorKey
      );
      toast.success(row.isActive ? "Access deactivated" : "Access activated");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleAccessApiError ? err.message : "Could not update status"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Module Access"
        description="Grant subscription modules to tenants — Super Admin Tenant Configuration."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-access/new`} />}
            >
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading access grants from database…
        </div>
      )}

      {error && !loading && (
        <EmptyState
          icon={KeyRound}
          tone="muted"
          heading="Could not load access grants"
          description={error}
          size="compact"
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:max-w-3xl">
          <StatCard icon={Building2} label="Tenants" value={tenantCount} />
          <StatCard icon={KeyRound} label="Total grants" value={rows.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} />
          <StatCard icon={CircleDashed} label="Inactive" value={rows.length - activeCount} />
        </div>
      )}

      {!loading && !error && (rows.length > 0 || tenants.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenant or module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={tenantFilter} onValueChange={(v) => setTenantFilter(v ?? "all")}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All tenants";
                  return (
                    tenants.find((t) => String(t.tenantKey) === value)?.branding.name ??
                    "All tenants"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.tenantKey} value={String(t.tenantKey)}>
                  {t.branding.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </Card>
      ) : error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            tone="primary"
            heading="No module access grants yet"
            description="Grant a subscription module to a tenant to get started."
            size="compact"
            action={
              canCreate ? (
                <Button
                  nativeButton={false}
                  render={<Link href={`/${role}/masters/subscription-module-access/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Grant access
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : tenantGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching grants"
            description="Try a different search or tenant filter."
            size="compact"
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {tenantGroups.map((group) => {
            const total = group.active.length + group.inactive.length;
            return (
              <Card key={group.tenantId} className="overflow-hidden">
                <CardContent className="space-y-5 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold tracking-tight">
                          {group.tenantName}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          {group.tenantCode ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                              {group.tenantCode}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {total} module{total === 1 ? "" : "s"}
                          </span>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {group.active.length} active
                          </Badge>
                          {group.inactive.length > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <CircleDashed className="h-3 w-3" />
                              {group.inactive.length} inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canCreate && (
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/${role}/masters/subscription-module-access/new?tenantId=${group.tenantId}`}
                          />
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Grant modules
                      </Button>
                    )}
                  </div>

                  <ModuleSection
                    title="Active modules"
                    icon={CheckCircle2}
                    rows={group.active}
                    emptyLabel="No active modules for this tenant."
                    role={role}
                    canEdit={canEdit}
                    onToggleStatus={toggleStatus}
                  />

                  <ModuleSection
                    title="Inactive modules"
                    icon={CircleDashed}
                    rows={group.inactive}
                    emptyLabel="No inactive modules."
                    role={role}
                    canEdit={canEdit}
                    onToggleStatus={toggleStatus}
                    muted
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionModuleAccessMasterPage() {
  return (
    <AccessGate module="subscriptionModuleAccess">
      {(roleDef) => <AccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
