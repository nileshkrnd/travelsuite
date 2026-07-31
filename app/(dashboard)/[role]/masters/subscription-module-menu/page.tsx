"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Layers, ListTree, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubscriptionModuleMenuTree } from "@/components/masters/SubscriptionModuleMenuTree";
import { TenantMenuSidebarPreview } from "@/components/masters/TenantMenuSidebarPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import {
  listSubscriptionModules,
  reorderSubscriptionModules,
  SubscriptionModulesApiError,
} from "@/lib/services/subscription-modules.service";
import {
  listSubscriptionModuleMenus,
  listTenantSubscriptionModuleMenus,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { listTenants } from "@/lib/services/tenants.service";
import { can } from "@/config/permissions";
import type { RoleDef, SubscriptionModule, SubscriptionModuleMenu, Tenant } from "@/types";

function SortableModuleCard({
  module,
  index,
  menuCount,
  open,
  onToggle,
  canReorder,
  reordering,
  children,
}: {
  module: SubscriptionModule;
  index: number;
  menuCount: number;
  open: boolean;
  onToggle: () => void;
  canReorder: boolean;
  reordering: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.subscriptionModuleId,
    disabled: !canReorder || reordering,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background",
        isDragging && "z-10 opacity-90 shadow-md"
      )}
    >
      <div className="flex items-stretch bg-muted/40">
        {canReorder ? (
          <button
            type="button"
            className="flex w-10 shrink-0 cursor-grab items-center justify-center border-e border-border text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            title="Drag to change module priority"
            disabled={reordering}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/70"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                #{index + 1}
              </Badge>
              <p className="truncate text-sm font-semibold">{module.subscriptionModuleName}</p>
              {!module.isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  inactive
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {menuCount} menu{menuCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {module.subscriptionProductName
                ? `Product: ${module.subscriptionProductName}`
                : module.description || "Subscription module"}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </div>
      {open && <div className="border-t border-border p-3 sm:p-4">{children}</div>}
    </div>
  );
}

function MenuHierarchy({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<SubscriptionModuleMenu[]>([]);
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [previewMenus, setPreviewMenus] = useState<SubscriptionModuleMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reorderingModules, setReorderingModules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModuleIds, setOpenModuleIds] = useState<Set<number>>(new Set());
  const [previewTenantId, setPreviewTenantId] = useState("");
  const canCreate = can(roleDef, "subscriptionModuleMenu", "create");
  const canEdit = can(roleDef, "subscriptionModuleMenu", "edit");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedModules = useMemo(
    () =>
      [...modules].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.subscriptionModuleName.localeCompare(b.subscriptionModuleName)
      ),
    [modules]
  );

  const [orderedModules, setOrderedModules] = useState<SubscriptionModule[]>([]);
  useEffect(() => {
    setOrderedModules(sortedModules);
  }, [sortedModules]);

  const menuCountByModule = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(row.subscriptionModuleId, (map.get(row.subscriptionModuleId) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [menuRows, moduleRows, tenantRows] = await Promise.all([
        listSubscriptionModuleMenus(),
        listSubscriptionModules(),
        listTenants().catch(() => [] as Tenant[]),
      ]);
      setRows(menuRows);
      setModules(moduleRows);
      setTenants(tenantRows.filter((t) => t.tenantKey > 0 && t.status === "active"));
      setOpenModuleIds((prev) => {
        if (prev.size > 0) {
          return new Set(
            [...prev].filter((id) => moduleRows.some((m) => m.subscriptionModuleId === id))
          );
        }
        const withMenus = moduleRows
          .filter((m) => menuRows.some((r) => r.subscriptionModuleId === m.subscriptionModuleId))
          .map((m) => m.subscriptionModuleId);
        return new Set(
          withMenus.length ? withMenus : moduleRows.slice(0, 1).map((m) => m.subscriptionModuleId)
        );
      });
      setPreviewTenantId((current) => {
        if (current && tenantRows.some((t) => t.id === current)) return current;
        return tenantRows.find((t) => t.tenantKey > 0)?.id ?? "";
      });
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

  const previewTenant = tenants.find((t) => t.id === previewTenantId);

  useEffect(() => {
    if (!previewTenant?.tenantKey) {
      setPreviewMenus([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    listTenantSubscriptionModuleMenus(previewTenant.tenantKey)
      .then((menus) => {
        if (!cancelled) setPreviewMenus(menus);
      })
      .catch(() => {
        if (!cancelled) setPreviewMenus([]);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewTenant?.tenantKey, rows, modules]);

  function toggleModule(id: number) {
    setOpenModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAllModules() {
    setOpenModuleIds(new Set(orderedModules.map((m) => m.subscriptionModuleId)));
  }

  function collapseAllModules() {
    setOpenModuleIds(new Set());
  }

  async function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canEdit || !actorKey) return;

    const ids = orderedModules.map((m) => m.subscriptionModuleId);
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderedModules, oldIndex, newIndex);
    setOrderedModules(next);
    setReorderingModules(true);
    try {
      await reorderSubscriptionModules({
        orderedIds: next.map((m) => m.subscriptionModuleId),
        modifiedBy: actorKey,
      });
      toast.success("Module order updated");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModulesApiError ? err.message : "Could not reorder modules"
      );
      await refresh();
    } finally {
      setReorderingModules(false);
    }
  }

  const canReorderModules = canEdit && actorKey > 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Subscription Module Menu"
        description="Drag modules to set sidebar priority (e.g. Administration above HRMS). Drag menus inside a module to set menu priority."
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

      {!loading && !error && modules.length === 0 && (
        <EmptyState
          icon={ListTree}
          tone="primary"
          heading="No subscription modules yet"
          description="Create a subscription module first, then link menus to it."
          size="compact"
        />
      )}

      {!loading && !error && modules.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {orderedModules.length} module{orderedModules.length === 1 ? "" : "s"} ·{" "}
                {rows.length} menus · drag modules to set tenant sidebar order
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={expandAllModules}>
                  Expand modules
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={collapseAllModules}>
                  Collapse modules
                </Button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void handleModuleDragEnd(e)}
            >
              <SortableContext
                items={orderedModules.map((m) => m.subscriptionModuleId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {orderedModules.map((module, index) => {
                    const count = menuCountByModule.get(module.subscriptionModuleId) ?? 0;
                    const open = openModuleIds.has(module.subscriptionModuleId);
                    return (
                      <SortableModuleCard
                        key={module.subscriptionModuleId}
                        module={module}
                        index={index}
                        menuCount={count}
                        open={open}
                        onToggle={() => toggleModule(module.subscriptionModuleId)}
                        canReorder={canReorderModules}
                        reordering={reorderingModules}
                      >
                        <SubscriptionModuleMenuTree
                          moduleId={module.subscriptionModuleId}
                          moduleName={module.subscriptionModuleName}
                          rows={rows}
                          roleSlug={role}
                          actorKey={actorKey}
                          canCreate={canCreate}
                          canEdit={canEdit}
                          onChanged={refresh}
                          compact
                        />
                      </SortableModuleCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <p className="text-sm font-medium">Preview as Tenant Admin</p>
                  <p className="text-xs text-muted-foreground">
                    Reflects module priority and menu order from Module Access.
                  </p>
                </div>
                <Select
                  value={previewTenantId}
                  onValueChange={(v) => setPreviewTenantId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select tenant…";
                        const t = tenants.find((row) => row.id === value);
                        return t?.branding.name ?? t?.groupName ?? "Select tenant…";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.branding.name || t.groupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {previewLoading ? (
              <div className="flex min-h-[28rem] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Loading preview…
              </div>
            ) : (
              <TenantMenuSidebarPreview
                tenantName={
                  previewTenant?.branding.name || previewTenant?.groupName || "Select a tenant"
                }
                menus={previewMenus}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionModuleMenuMasterPage() {
  return (
    <AccessGate module="subscriptionModuleMenu">
      {(roleDef) => <MenuHierarchy roleDef={roleDef} />}
    </AccessGate>
  );
}
