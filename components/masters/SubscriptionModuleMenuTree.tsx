"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import {
  buildSubscriptionMenuTree,
  type SubscriptionMenuTreeNode,
} from "@/lib/subscription-module-menu-tree";
import {
  createSubscriptionModuleMenu,
  deleteSubscriptionModuleMenu,
  reorderSubscriptionModuleMenus,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SubscriptionModuleMenu } from "@/types";

type AddTarget = {
  parentMenuId: number | null;
  parentLabel: string;
};

function SortableTreeNode({
  node,
  depth,
  index,
  openIds,
  toggleOpen,
  roleSlug,
  canCreate,
  canEdit,
  canReorder,
  busyId,
  reordering,
  onRequestAddChild,
  onRequestAddSibling,
  onRequestRemove,
  onReorderSiblings,
}: {
  node: SubscriptionMenuTreeNode;
  depth: number;
  index: number;
  openIds: Set<number>;
  toggleOpen: (id: number) => void;
  roleSlug: string;
  canCreate: boolean;
  canEdit: boolean;
  canReorder: boolean;
  busyId: number | null;
  reordering: boolean;
  onRequestAddChild: (parent: SubscriptionMenuTreeNode) => void;
  onRequestAddSibling: (node: SubscriptionMenuTreeNode) => void;
  onRequestRemove: (row: SubscriptionModuleMenu) => void;
  onReorderSiblings: (
    parentMenuId: number | null,
    orderedIds: number[]
  ) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.subscriptionModuleMenuId,
    disabled: !canReorder || reordering,
  });

  const hasChildren = node.children.length > 0;
  const isOpen = openIds.has(node.subscriptionModuleMenuId);
  const Icon = ICONS[node.menuIcon] ?? Layers;
  const busy = busyId === node.subscriptionModuleMenuId;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${depth * 1.1 + 0.25}rem`,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10 opacity-80")}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1.5 hover:bg-muted/50",
          isDragging && "border-border bg-muted shadow-sm"
        )}
      >
        {canReorder ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            title="Drag to change priority"
            disabled={reordering}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0" />
        )}

        {hasChildren ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => toggleOpen(node.subscriptionModuleMenuId)}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0" />
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Badge variant="outline" className="shrink-0 px-1.5 font-mono text-[10px]">
            #{index + 1}
          </Badge>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{node.menuName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{node.menuUrl}</p>
          </div>
          {!node.isActive && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              inactive
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          {canCreate && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                title="Add child under this menu"
                onClick={() => onRequestAddChild(node)}
              >
                <Plus className="h-3.5 w-3.5" />
                Child
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                title="Add sibling at this level"
                onClick={() => onRequestAddSibling(node)}
              >
                <Plus className="h-3.5 w-3.5" />
                Sibling
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={
              <Link
                href={`/${roleSlug}/masters/subscription-module-menu/${node.subscriptionModuleMenuId}`}
              />
            }
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canEdit && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={
                  <Link
                    href={`/${roleSlug}/masters/subscription-module-menu/${node.subscriptionModuleMenuId}/edit`}
                  />
                }
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onRequestRemove(node)}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="ms-3 border-l border-sidebar-border pl-1">
          <SortableSiblingList
            nodes={node.children}
            parentMenuId={node.subscriptionModuleMenuId}
            depth={depth + 1}
            openIds={openIds}
            toggleOpen={toggleOpen}
            roleSlug={roleSlug}
            canCreate={canCreate}
            canEdit={canEdit}
            canReorder={canReorder}
            busyId={busyId}
            reordering={reordering}
            onRequestAddChild={onRequestAddChild}
            onRequestAddSibling={onRequestAddSibling}
            onRequestRemove={onRequestRemove}
            onReorderSiblings={onReorderSiblings}
          />
        </div>
      )}
    </div>
  );
}

function SortableSiblingList({
  nodes,
  parentMenuId,
  depth,
  openIds,
  toggleOpen,
  roleSlug,
  canCreate,
  canEdit,
  canReorder,
  busyId,
  reordering,
  onRequestAddChild,
  onRequestAddSibling,
  onRequestRemove,
  onReorderSiblings,
}: {
  nodes: SubscriptionMenuTreeNode[];
  parentMenuId: number | null;
  depth: number;
  openIds: Set<number>;
  toggleOpen: (id: number) => void;
  roleSlug: string;
  canCreate: boolean;
  canEdit: boolean;
  canReorder: boolean;
  busyId: number | null;
  reordering: boolean;
  onRequestAddChild: (parent: SubscriptionMenuTreeNode) => void;
  onRequestAddSibling: (node: SubscriptionMenuTreeNode) => void;
  onRequestRemove: (row: SubscriptionModuleMenu) => void;
  onReorderSiblings: (
    parentMenuId: number | null,
    orderedIds: number[]
  ) => Promise<void>;
}) {
  const [items, setItems] = useState(nodes);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setItems(nodes);
  }, [nodes]);

  const ids = items.map((n) => n.subscriptionModuleMenuId);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canReorder) return;

    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await onReorderSiblings(
      parentMenuId,
      next.map((n) => n.subscriptionModuleMenuId)
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((node, index) => (
          <SortableTreeNode
            key={node.subscriptionModuleMenuId}
            node={node}
            depth={depth}
            index={index}
            openIds={openIds}
            toggleOpen={toggleOpen}
            roleSlug={roleSlug}
            canCreate={canCreate}
            canEdit={canEdit}
            canReorder={canReorder}
            busyId={busyId}
            reordering={reordering}
            onRequestAddChild={onRequestAddChild}
            onRequestAddSibling={onRequestAddSibling}
            onRequestRemove={onRequestRemove}
            onReorderSiblings={onReorderSiblings}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SubscriptionModuleMenuTree({
  moduleId,
  moduleName,
  rows,
  roleSlug,
  actorKey,
  canCreate,
  canEdit,
  onChanged,
  compact = false,
}: {
  moduleId: number;
  moduleName: string;
  rows: SubscriptionModuleMenu[];
  roleSlug: string;
  actorKey: number;
  canCreate: boolean;
  canEdit: boolean;
  onChanged: () => Promise<void>;
  compact?: boolean;
}) {
  const moduleRows = useMemo(
    () => rows.filter((r) => r.subscriptionModuleId === moduleId),
    [rows, moduleId]
  );
  const tree = useMemo(() => buildSubscriptionMenuTree(moduleRows), [moduleRows]);

  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SubscriptionModuleMenu | null>(null);
  const [removing, setRemoving] = useState(false);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formIcon, setFormIcon] = useState("Layers");

  useEffect(() => {
    const ids = new Set<number>();
    function walk(nodes: SubscriptionMenuTreeNode[]) {
      for (const n of nodes) {
        if (n.children.length) {
          ids.add(n.subscriptionModuleMenuId);
          walk(n.children);
        }
      }
    }
    walk(tree);
    setOpenIds(ids);
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps -- expand when module changes

  function toggleOpen(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const all = new Set<number>();
    function walk(nodes: SubscriptionMenuTreeNode[]) {
      for (const n of nodes) {
        if (n.children.length) {
          all.add(n.subscriptionModuleMenuId);
          walk(n.children);
        }
      }
    }
    walk(tree);
    setOpenIds(all);
  }

  function openAdd(target: AddTarget) {
    setFormName("");
    setFormUrl("");
    setFormIcon("Layers");
    setAddTarget(target);
  }

  async function handleReorder(parentMenuId: number | null, orderedIds: number[]) {
    if (!actorKey || !canEdit) return;
    setReordering(true);
    try {
      await reorderSubscriptionModuleMenus({
        subscriptionModuleId: moduleId,
        parentMenuId,
        orderedIds,
        modifiedBy: actorKey,
      });
      toast.success("Menu order updated");
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleMenusApiError ? err.message : "Could not reorder menus"
      );
      await onChanged();
    } finally {
      setReordering(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setBusyId(removeTarget.subscriptionModuleMenuId);
    try {
      await deleteSubscriptionModuleMenu(removeTarget.subscriptionModuleMenuId);
      toast.success("Menu removed (children removed too)");
      setRemoveTarget(null);
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleMenusApiError ? err.message : "Could not remove menu"
      );
    } finally {
      setRemoving(false);
      setBusyId(null);
    }
  }

  async function confirmAdd() {
    if (!actorKey || !canCreate || !addTarget) return;
    const menuName = formName.trim();
    const menuUrl = normalizeMenuUrl(formUrl);
    if (!menuName) {
      toast.error("Menu name is required");
      return;
    }
    if (!menuUrl) {
      toast.error("Menu URL is required");
      return;
    }
    setSaving(true);
    try {
      await createSubscriptionModuleMenu({
        subscriptionModuleId: moduleId,
        parentMenuId: addTarget.parentMenuId,
        menuName,
        menuUrl,
        menuIcon: formIcon,
        createdBy: actorKey,
      });
      toast.success(`${menuName} added`);
      setAddTarget(null);
      await onChanged();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleMenusApiError ? err.message : "Could not add menu"
      );
    } finally {
      setSaving(false);
    }
  }

  const IconPreview = ICONS[formIcon] ?? Layers;
  const canReorder = canEdit && actorKey > 0;

  return (
    <>
      <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-2", compact && "mb-2")}>
        {!compact ? (
          <p className="text-sm text-muted-foreground">
            Drag the handle to set menu priority for{" "}
            <span className="font-medium text-foreground">{moduleName}</span>
            {" · "}
            {moduleRows.length} menus
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {moduleRows.length} menus · drag <GripVertical className="inline h-3 w-3" /> to reorder
            priority
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={expandAll}>
            Expand all
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpenIds(new Set())}>
            Collapse all
          </Button>
          {canCreate && (
            <Button
              type="button"
              size="sm"
              onClick={() => openAdd({ parentMenuId: null, parentLabel: "top level" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add top-level
            </Button>
          )}
        </div>
      </div>

      <div className={cn(!compact && "rounded-lg border border-border p-2")}>
        {tree.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No menus in the database for this module yet. Add a top-level menu to start.
          </p>
        ) : (
          <SortableSiblingList
            nodes={tree}
            parentMenuId={null}
            depth={0}
            openIds={openIds}
            toggleOpen={toggleOpen}
            roleSlug={roleSlug}
            canCreate={canCreate}
            canEdit={canEdit}
            canReorder={canReorder}
            busyId={busyId}
            reordering={reordering}
            onRequestAddChild={(parent) =>
              openAdd({
                parentMenuId: parent.subscriptionModuleMenuId,
                parentLabel: parent.menuName,
              })
            }
            onRequestAddSibling={(sibling) =>
              openAdd({
                parentMenuId: sibling.parentMenuId,
                parentLabel: sibling.parentMenuName ?? "top level",
              })
            }
            onRequestRemove={setRemoveTarget}
            onReorderSiblings={handleReorder}
          />
        )}
      </div>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.menuName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the menu from the database. Any child menus under it are also removed.
              Tenants with this module will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={removing} onClick={() => void confirmRemove()}>
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!addTarget}
        onOpenChange={(open) => {
          if (!open && !saving) setAddTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add menu</DialogTitle>
            <DialogDescription>
              Create a menu under <span className="font-medium">{addTarget?.parentLabel}</span> for{" "}
              {moduleName}. Name, URL, and icon are stored in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tree-menu-name" required>
                Menu name
              </Label>
              <Input
                id="tree-menu-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Sales Dashboard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tree-menu-url" required>
                Menu URL
              </Label>
              <Input
                id="tree-menu-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                maxLength={200}
                placeholder="e.g. sales/dashboard"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={formIcon} onValueChange={(v) => v && setFormIcon(v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {() => (
                      <span className="flex items-center gap-2">
                        <IconPreview className="h-4 w-4" />
                        {formIcon}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ICON_NAMES.map((name) => {
                    const Ic = ICONS[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <Ic className="h-4 w-4" />
                          {name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setAddTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void confirmAdd()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving…" : "Add menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
