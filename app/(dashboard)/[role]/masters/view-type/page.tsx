"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Eye, MoreHorizontal, X, Search } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createViewType,
  deleteViewType,
  listViewTypes,
  setViewTypeActive,
  updateViewType,
  ViewTypesApiError,
} from "@/lib/services/view-types.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { ViewType, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "name" | "code" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useViewTypeSchema(rows: ViewType[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, "View type code is required")
      .max(50, "Must be 50 characters or fewer")
      .refine(
        (value) =>
          !rows.some((r) => r.id !== currentId && r.code.toLowerCase() === value.trim().toLowerCase()),
        "This view type code already exists"
      ),
    name: z.string().trim().min(1, "View type name is required").max(200, "Must be 200 characters or fewer"),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    displayOrder: z.preprocess(
      (v) => (v === "" || v == null ? 0 : Number(v)),
      z.number().int().min(0)
    ),
  });
}

type FormValues = z.infer<ReturnType<typeof useViewTypeSchema>>;

function ViewTypePanel({
  mode,
  row,
  rows,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ViewType;
  rows: ViewType[];
  actorKey: number;
  onSaved: (row: ViewType) => void;
  onClose: () => void;
}) {
  const schema = useViewTypeSchema(rows, row?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      code: row?.code ?? "",
      name: row?.name ?? "",
      description: row?.description ?? "",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        const saved = await updateViewType(row.viewTypeKey, {
          viewTypeCode: values.code.trim(),
          viewTypeName: values.name.trim(),
          description: values.description?.trim() || null,
          displayOrder: values.displayOrder,
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("View type updated");
      } else if (mode === "create") {
        const created = await createViewType({
          viewTypeCode: values.code.trim(),
          viewTypeName: values.name.trim(),
          description: values.description?.trim() || null,
          displayOrder: values.displayOrder,
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("View type created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof ViewTypesApiError ? error.message : "Could not save view type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add view type" : mode === "edit" ? "Edit view type" : "View type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code" required>
            Code
          </Label>
          <Input
            id="code"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. SEA"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Name
          </Label>
          <Input
            id="name"
            disabled={isReadOnly}
            placeholder="e.g. Sea View"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} disabled={isReadOnly} {...register("description")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>
                {row.isActive ? "active" : "inactive"}
              </Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function ViewTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<ViewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ViewType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "viewType", "edit");
  const canCreate = can(roleDef, "viewType", "create");
  const canDelete = can(roleDef, "viewType", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listViewTypes()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ViewTypesApiError ? err.message : "Failed to load");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((r) => (statusFilter === "active" ? r.isActive : !r.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp =
          sortKey === "name"
            ? a.name.localeCompare(b.name)
            : sortKey === "code"
              ? a.code.localeCompare(b.code)
              : a.displayOrder - b.displayOrder;
        return sortDirection === "asc" ? cmp : -cmp;
      });
    } else {
      result = [...result].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  function upsertLocal(row: ViewType) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [...prev, row] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(row: ViewType) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setViewTypeActive(row.viewTypeKey, !row.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof ViewTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ViewType) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteViewType(row.viewTypeKey, actorKey);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("View type deleted");
    } catch (error) {
      toast.error(error instanceof ViewTypesApiError ? error.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="View Type"
        description="Global lookup of room views (City, Sea, Pool, Garden, Beach, Mountain, Desert, Landmark, …)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add view type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {panelMode !== "closed" && (
        <ViewTypePanel
          mode={panelMode}
          row={target}
          rows={rows}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {!loading && rows.length === 0 ? (
          <EmptyState
            icon={Eye}
            tone="primary"
            heading="No view types yet"
            description="Add your first entry (e.g. Sea View, City View)."
            size="compact"
          />
        ) : visible.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching entries"
            description="Try a different search term or filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="displayOrder"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Order
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.displayOrder}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"}>
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setTarget(row);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(row);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(row)}>
                              {row.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>
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

export default function ViewTypeMasterPage() {
  return <AccessGate module="viewType">{(roleDef) => <ViewTypeList roleDef={roleDef} />}</AccessGate>;
}
