"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ListTree,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
import { listSubscriptionModules } from "@/lib/services/subscription-modules.service";
import {
  listSubscriptionModuleMenus,
  setSubscriptionModuleMenuActive,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModule, SubscriptionModuleMenu } from "@/types";

type SortKey = "menuName" | "menuUrl" | "subscriptionModuleName" | "createdDtTm";

function MenuList({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<SubscriptionModuleMenu[]>([]);
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canCreate = can(roleDef, "subscriptionModuleMenu", "create");
  const canEdit = can(roleDef, "subscriptionModuleMenu", "edit");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [menuRows, moduleRows] = await Promise.all([
        listSubscriptionModuleMenus(),
        listSubscriptionModules(),
      ]);
      setRows(menuRows);
      setModules(moduleRows);
    } catch (err) {
      setError(err instanceof SubscriptionModuleMenusApiError ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (moduleFilter !== "all") {
      const mid = Number(moduleFilter);
      result = result.filter((r) => r.subscriptionModuleId === mid);
    }
    if (term) {
      result = result.filter(
        (r) =>
          r.menuName.toLowerCase().includes(term) ||
          r.menuUrl.toLowerCase().includes(term) ||
          (r.subscriptionModuleName ?? "").toLowerCase().includes(term) ||
          (r.subscriptionProductName ?? "").toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        const cmp = av.localeCompare(bv);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, moduleFilter, sortKey, sortDirection]);

  async function toggleStatus(row: SubscriptionModuleMenu) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setSubscriptionModuleMenuActive(row.subscriptionModuleMenuId, !row.isActive, actorKey);
      toast.success(row.isActive ? "Menu deactivated" : "Menu activated");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleMenusApiError ? err.message : "Could not update status"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Module Menu"
        description="Menus linked to subscription modules — Tenant Admins only see menus for modules granted to them."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/masters/subscription-module-menu/new`} />}
            >
              <Plus className="h-4 w-4" />
              Add menu
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading module menus…
        </div>
      )}

      {error && !loading && (
        <EmptyState
          icon={ListTree}
          tone="muted"
          heading="Could not load module menus"
          description={error}
          size="compact"
        />
      )}

      {!loading && !error && (rows.length > 0 || modules.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu or module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All modules";
                  return (
                    modules.find((m) => String(m.subscriptionModuleId) === value)
                      ?.subscriptionModuleName ?? "All modules"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m.subscriptionModuleId} value={String(m.subscriptionModuleId)}>
                  {m.subscriptionModuleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? null : rows.length === 0 ? (
          <EmptyState
            icon={ListTree}
            tone="primary"
            heading="No module menus yet"
            description="Link app menus to subscription modules so Tenant Admins see the right navigation."
            size="compact"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching menus"
            description="Try a different search or module filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="menuName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Menu name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="menuUrl"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Menu URL
                </SortableTableHead>
                <SortableTableHead
                  sortKey="subscriptionModuleName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Module
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow
                  key={row.subscriptionModuleMenuId}
                  onClick={() =>
                    router.push(
                      `/${role}/masters/subscription-module-menu/${row.subscriptionModuleMenuId}`
                    )
                  }
                  className="cursor-pointer"
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <ListTree className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{row.menuName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.menuUrl}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.subscriptionModuleName ?? "—"}
                    {row.subscriptionProductName ? (
                      <span className="block text-xs">{row.subscriptionProductName}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"} className="gap-1">
                      {row.isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/${role}/masters/subscription-module-menu/${row.subscriptionModuleMenuId}`}
                            />
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/${role}/masters/subscription-module-menu/${row.subscriptionModuleMenuId}/edit`}
                                />
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(row)}>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function SubscriptionModuleMenuMasterPage() {
  return (
    <AccessGate module="subscriptionModuleMenu">
      {(roleDef) => <MenuList roleDef={roleDef} />}
    </AccessGate>
  );
}
