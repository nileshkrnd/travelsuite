"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Layers, Loader2, Lock, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAccessRoles, AccessRolesApiError } from "@/lib/services/access-roles.service";
import { listCompanies, CompaniesApiError } from "@/lib/services/db-companies.service";
import { listTenantSubscriptionModuleMenus } from "@/lib/services/subscription-module-menus.service";
import {
  listTenantAccessRoleMenuPermissions,
  saveTenantAccessRoleMenuPermissions,
  TenantAccessRoleMenuPermissionsApiError,
} from "@/lib/services/tenant-access-role-menu-permissions.service";
import {
  buildSubscriptionMenuTree,
  type SubscriptionMenuTreeNode,
} from "@/lib/subscription-module-menu-tree";
import { can } from "@/config/permissions";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import type {
  AccessRole,
  Company,
  MenuPermissionFlags,
  MenuPermissionRowInput,
  RoleDef,
  SubscriptionModuleMenu,
} from "@/types";

const FLAG_COLS: { key: keyof MenuPermissionFlags; label: string; short: string }[] = [
  { key: "canView", label: "View", short: "View" },
  { key: "canCreate", label: "Create", short: "Create" },
  { key: "canEdit", label: "Edit", short: "Edit" },
  { key: "canDelete", label: "Delete", short: "Delete" },
  { key: "canApprove", label: "Approve", short: "Approve" },
  { key: "canExport", label: "Export", short: "Export" },
  { key: "canPrint", label: "Print", short: "Print" },
  { key: "canReadOnly", label: "Read-only", short: "RO" },
  { key: "isActive", label: "Active", short: "Active" },
];

const EMPTY_FLAGS: MenuPermissionFlags = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  canPrint: false,
  canReadOnly: false,
  isActive: true,
};

type ModuleGroup = {
  moduleId: number;
  name: string;
  sortOrder: number;
  menuIds: number[];
  tree: SubscriptionMenuTreeNode[];
};

function collectMenuIds(nodes: SubscriptionMenuTreeNode[]): number[] {
  const ids: number[] = [];
  function walk(list: SubscriptionMenuTreeNode[]) {
    for (const n of list) {
      ids.push(n.subscriptionModuleMenuId);
      if (n.children.length) walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

function triState(values: boolean[]): boolean | "indeterminate" {
  if (values.length === 0) return false;
  if (values.every(Boolean)) return true;
  if (values.every((v) => !v)) return false;
  return "indeterminate";
}

function FlagSelectAll({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean | "indeterminate";
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md px-1.5 py-1 text-center",
        !disabled && "cursor-pointer hover:bg-muted/60"
      )}
    >
      <Checkbox
        checked={checked === true}
        indeterminate={checked === "indeterminate"}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
        aria-label={`Select all ${label}`}
      />
      <span className="text-[10px] font-medium leading-none text-muted-foreground">{label}</span>
    </label>
  );
}

function MenuTreeRows({
  nodes,
  depth,
  matrix,
  canEdit,
  onFlag,
}: {
  nodes: SubscriptionMenuTreeNode[];
  depth: number;
  matrix: Record<number, MenuPermissionFlags>;
  canEdit: boolean;
  onFlag: (menuId: number, key: keyof MenuPermissionFlags, value: boolean) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const flags = matrix[node.subscriptionModuleMenuId] ?? EMPTY_FLAGS;
        const Icon = ICONS[node.menuIcon] ?? Layers;
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.subscriptionModuleMenuId}>
            <div
              className={cn(
                "grid items-center gap-2 border-b border-border/60 py-2.5 pe-3",
                "grid-cols-[minmax(200px,1.4fr)_repeat(9,minmax(44px,1fr))]"
              )}
              style={{ paddingInlineStart: `${12 + depth * 16}px` }}
            >
              <div className="flex min-w-0 items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                <div className="min-w-0">
                  <p className={cn("truncate text-sm", hasChildren ? "font-semibold" : "font-medium")}>
                    {node.menuName}
                  </p>
                  {!hasChildren ? (
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{node.menuUrl}</p>
                  ) : null}
                </div>
              </div>
              {FLAG_COLS.map((col) => (
                <div key={col.key} className="flex justify-center">
                  <Checkbox
                    checked={flags[col.key]}
                    disabled={!canEdit}
                    onCheckedChange={(v) =>
                      onFlag(node.subscriptionModuleMenuId, col.key, v === true)
                    }
                    aria-label={`${node.menuName} ${col.label}`}
                  />
                </div>
              ))}
            </div>
            {hasChildren ? (
              <MenuTreeRows
                nodes={node.children}
                depth={depth + 1}
                matrix={matrix}
                canEdit={canEdit}
                onFlag={onFlag}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function RoleMenuPermissionMatrix({
  roleDef,
  tenantKey,
  actorKey,
}: {
  roleDef: RoleDef;
  tenantKey: number;
  actorKey: number;
}) {
  const canEdit = can(roleDef, "permissions", "edit") || can(roleDef, "permissions", "create");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [menus, setMenus] = useState<SubscriptionModuleMenu[]>([]);
  const [companyId, setCompanyId] = useState(0);
  const [accessRoleId, setAccessRoleId] = useState<number>(0);
  const [matrix, setMatrix] = useState<Record<number, MenuPermissionFlags>>({});
  const [baseline, setBaseline] = useState<Record<number, MenuPermissionFlags>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingMeta(true);
    setMetaError(null);
    Promise.all([
      listCompanies({ tenantId: tenantKey, activeOnly: true }),
      listTenantSubscriptionModuleMenus(tenantKey),
    ])
      .then(([companyRows, menuRows]) => {
        if (cancelled) return;
        setCompanies(companyRows);
        setMenus(menuRows.filter((m) => m.isActive));
      })
      .catch((err) => {
        if (cancelled) return;
        setMetaError(
          err instanceof CompaniesApiError ? err.message : "Failed to load companies or menus"
        );
        setCompanies([]);
        setMenus([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAccessRoles({ tenantId: tenantKey, companyId: 0, activeOnly: true }),
      companyId > 0
        ? listAccessRoles({ tenantId: tenantKey, companyId, activeOnly: true })
        : Promise.resolve([] as AccessRole[]),
    ])
      .then(([tenantWide, companyScoped]) => {
        if (cancelled) return;
        const byId = new Map<number, AccessRole>();
        for (const row of [...tenantWide, ...companyScoped]) byId.set(row.accessRoleId, row);
        const rows = [...byId.values()].sort((a, b) =>
          a.accessRoleName.localeCompare(b.accessRoleName)
        );
        setRoles(rows);
        setAccessRoleId((prev) =>
          rows.some((r) => r.accessRoleId === prev) ? prev : rows[0]?.accessRoleId ?? 0
        );
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof AccessRolesApiError ? err.message : "Failed to load access roles");
        setRoles([]);
        setAccessRoleId(0);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyId]);

  useEffect(() => {
    if (!accessRoleId || menus.length === 0) {
      setMatrix({});
      setBaseline({});
      return;
    }
    let cancelled = false;
    setLoadingMatrix(true);
    listTenantAccessRoleMenuPermissions({
      tenantId: tenantKey,
      companyId,
      accessRoleId,
    })
      .then((rows) => {
        if (cancelled) return;
        const next: Record<number, MenuPermissionFlags> = {};
        for (const menu of menus) {
          next[menu.subscriptionModuleMenuId] = { ...EMPTY_FLAGS };
        }
        for (const row of rows) {
          next[row.subscriptionModuleMenuId] = {
            canView: row.canView,
            canCreate: row.canCreate,
            canEdit: row.canEdit,
            canDelete: row.canDelete,
            canApprove: row.canApprove,
            canExport: row.canExport,
            canPrint: row.canPrint,
            canReadOnly: row.canReadOnly,
            isActive: row.isActive,
          };
        }
        setMatrix(next);
        setBaseline(structuredClone(next));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof TenantAccessRoleMenuPermissionsApiError
            ? err.message
            : "Failed to load permissions"
        );
        setMatrix({});
        setBaseline({});
      })
      .finally(() => {
        if (!cancelled) setLoadingMatrix(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyId, accessRoleId, menus]);

  const moduleGroups = useMemo((): ModuleGroup[] => {
    const byModule = new Map<number, SubscriptionModuleMenu[]>();
    for (const menu of menus) {
      const list = byModule.get(menu.subscriptionModuleId) ?? [];
      list.push(menu);
      byModule.set(menu.subscriptionModuleId, list);
    }

    return [...byModule.entries()]
      .map(([moduleId, moduleMenus]) => {
        const first = moduleMenus[0]!;
        const tree = buildSubscriptionMenuTree(moduleMenus);
        return {
          moduleId,
          name: first.subscriptionModuleName || `Module ${moduleId}`,
          sortOrder: first.moduleSortOrder ?? 0,
          menuIds: collectMenuIds(tree),
          tree,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [menus]);

  const allMenuIds = useMemo(
    () => moduleGroups.flatMap((g) => g.menuIds),
    [moduleGroups]
  );

  const dirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(baseline),
    [matrix, baseline]
  );

  function setFlag(menuId: number, key: keyof MenuPermissionFlags, value: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [menuId]: { ...(prev[menuId] ?? EMPTY_FLAGS), [key]: value },
    }));
  }

  function setFlagForMenus(menuIds: number[], key: keyof MenuPermissionFlags, value: boolean) {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const id of menuIds) {
        next[id] = { ...(next[id] ?? EMPTY_FLAGS), [key]: value };
        if (key === "canView" && value) next[id] = { ...next[id]!, isActive: true };
      }
      return next;
    });
  }

  function flagStateFor(menuIds: number[], key: keyof MenuPermissionFlags) {
    return triState(menuIds.map((id) => matrix[id]?.[key] ?? false));
  }

  function reset() {
    setMatrix(structuredClone(baseline));
  }

  async function save() {
    if (!accessRoleId || !actorKey) {
      toast.error("Select an access role and sign in again if needed.");
      return;
    }
    const rows: MenuPermissionRowInput[] = allMenuIds.map((id) => {
      const flags = matrix[id] ?? EMPTY_FLAGS;
      return { subscriptionModuleMenuId: id, ...flags };
    });
    setSaving(true);
    try {
      await saveTenantAccessRoleMenuPermissions({
        tenantId: tenantKey,
        companyId,
        accessRoleId,
        createdBy: actorKey,
        modifiedBy: actorKey,
        rows,
      });
      setBaseline(structuredClone(matrix));
      toast.success("Permissions saved");
    } catch (err) {
      toast.error(
        err instanceof TenantAccessRoleMenuPermissionsApiError
          ? err.message
          : "Could not save permissions"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading permissions…
      </div>
    );
  }

  if (metaError) {
    return <div className="p-6 text-sm text-destructive">{metaError}</div>;
  }

  if (menus.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Permissions"
          description="Assign menu actions to Access Roles for this tenant."
        />
        <EmptyState
          icon={Lock}
          tone="primary"
          heading="No module menus available"
          description="Grant Module Access to this tenant first so Module Menus appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Permissions"
        description="Grant menu actions by Access Role. Modules and menus match the tenant sidebar."
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={reset} disabled={!dirty || saving}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={!dirty || saving || !accessRoleId}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={String(companyId)} onValueChange={(v) => setCompanyId(v ? Number(v) : 0)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>
                  {(value: string | null) =>
                    value === "0" || !value
                      ? "All companies (tenant-wide)"
                      : companies.find((c) => String(c.companyKey) === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All companies (tenant-wide)</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.companyKey} value={String(c.companyKey)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Access role</Label>
            <Select
              value={accessRoleId > 0 ? String(accessRoleId) : ""}
              onValueChange={(v) => setAccessRoleId(v ? Number(v) : 0)}
              disabled={roles.length === 0}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return roles.length ? "Select access role" : "No access roles";
                    return (
                      roles.find((r) => String(r.accessRoleId) === value)?.accessRoleName ?? value
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.accessRoleId} value={String(r.accessRoleId)}>
                    {r.accessRoleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Create an Access Role under Masters → Access Role first.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!accessRoleId ? (
        <EmptyState
          icon={Lock}
          tone="muted"
          size="compact"
          heading="Select an access role"
          description="Choose a company scope and access role to edit menu permissions."
        />
      ) : loadingMatrix ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading matrix…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Global select-all */}
          <Card>
            <CardContent className="p-4">
              <div
                className={cn(
                  "grid items-end gap-2",
                  "grid-cols-[minmax(200px,1.4fr)_repeat(9,minmax(44px,1fr))]"
                )}
              >
                <div>
                  <p className="text-sm font-semibold">All modules</p>
                  <p className="text-xs text-muted-foreground">
                    Select all for every menu under every module
                  </p>
                </div>
                {FLAG_COLS.map((col) => (
                  <FlagSelectAll
                    key={col.key}
                    label={col.short}
                    checked={flagStateFor(allMenuIds, col.key)}
                    disabled={!canEdit}
                    onChange={(value) => setFlagForMenus(allMenuIds, col.key, value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {moduleGroups.map((group) => {
            const collapsed = collapsedModules[group.moduleId] === true;
            return (
              <Card key={group.moduleId} className="overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-3 py-3 sm:px-4">
                  <div
                    className={cn(
                      "grid items-end gap-2",
                      "grid-cols-[minmax(200px,1.4fr)_repeat(9,minmax(44px,1fr))]"
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-start"
                      onClick={() =>
                        setCollapsedModules((prev) => ({
                          ...prev,
                          [group.moduleId]: !collapsed,
                        }))
                      }
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          collapsed && "-rotate-90"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.menuIds.length} menu{group.menuIds.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                    {FLAG_COLS.map((col) => (
                      <FlagSelectAll
                        key={col.key}
                        label={col.short}
                        checked={flagStateFor(group.menuIds, col.key)}
                        disabled={!canEdit}
                        onChange={(value) => setFlagForMenus(group.menuIds, col.key, value)}
                      />
                    ))}
                  </div>
                </div>

                {!collapsed ? (
                  <div className="overflow-x-auto">
                    <div
                      className={cn(
                        "grid items-center gap-2 border-b border-border bg-background px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-4",
                        "grid-cols-[minmax(200px,1.4fr)_repeat(9,minmax(44px,1fr))]"
                      )}
                    >
                      <span className="ps-3">Menu</span>
                      {FLAG_COLS.map((col) => (
                        <span key={col.key} className="text-center">
                          {col.short}
                        </span>
                      ))}
                    </div>
                    <MenuTreeRows
                      nodes={group.tree}
                      depth={0}
                      matrix={matrix}
                      canEdit={canEdit}
                      onFlag={setFlag}
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
