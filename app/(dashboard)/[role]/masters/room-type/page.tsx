"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Home, MoreHorizontal, X, Search } from "lucide-react";
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
  createRoomType,
  deleteRoomType,
  listRoomTypes,
  setRoomTypeActive,
  updateRoomType,
  RoomTypesApiError,
} from "@/lib/services/room-types.service";
import { listRoomCategories } from "@/lib/services/room-categories.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { RoomType, RoomCategory, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "name" | "code" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useRoomTypeSchema(rows: RoomType[], currentId?: string) {
  return z.object({
    roomCategoryId: z.number().int().positive("Select a room category"),
    code: z
      .string()
      .trim()
      .min(1, "Room type code is required")
      .max(50, "Must be 50 characters or fewer")
      .refine(
        (value) =>
          !rows.some((r) => r.id !== currentId && r.code.toLowerCase() === value.trim().toLowerCase()),
        "This room type code already exists"
      ),
    name: z.string().trim().min(1, "Room type name is required").max(200, "Must be 200 characters or fewer"),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    displayOrder: z.preprocess(
      (v) => (v === "" || v == null ? 0 : Number(v)),
      z.number().int().min(0)
    ),
  });
}

type FormValues = z.infer<ReturnType<typeof useRoomTypeSchema>>;

function RoomTypePanel({
  mode,
  row,
  rows,
  categories,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: RoomType;
  rows: RoomType[];
  categories: RoomCategory[];
  actorKey: number;
  onSaved: (row: RoomType) => void;
  onClose: () => void;
}) {
  const schema = useRoomTypeSchema(rows, row?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      roomCategoryId: row?.roomCategoryKey ?? categories[0]?.roomCategoryKey ?? 0,
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
        const saved = await updateRoomType(row.roomTypeKey, {
          roomCategoryId: values.roomCategoryId,
          roomTypeCode: values.code.trim(),
          roomTypeName: values.name.trim(),
          description: values.description?.trim() || null,
          displayOrder: values.displayOrder,
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Room type updated");
      } else if (mode === "create") {
        const created = await createRoomType({
          roomCategoryId: values.roomCategoryId,
          roomTypeCode: values.code.trim(),
          roomTypeName: values.name.trim(),
          description: values.description?.trim() || null,
          displayOrder: values.displayOrder,
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Room type created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof RoomTypesApiError ? error.message : "Could not save room type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add room type" : mode === "edit" ? "Edit room type" : "Room type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label required>Room category</Label>
          <Controller
            control={control}
            name="roomCategoryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.roomCategoryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select room category";
                      return categories.find((c) => String(c.roomCategoryKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.roomCategoryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.roomCategoryId && <p className="text-sm text-destructive">{errors.roomCategoryId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code" required>
            Room type code
          </Label>
          <Input
            id="code"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. STD_KING"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Room type name
          </Label>
          <Input
            id="name"
            disabled={isReadOnly}
            placeholder="e.g. Standard King Room"
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

function RoomTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<RoomType[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<RoomType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "roomType", "edit");
  const canCreate = can(roleDef, "roomType", "create");
  const canDelete = can(roleDef, "roomType", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listRoomTypes(), listRoomCategories({ activeOnly: true })])
      .then(([roomTypeRows, categoryRows]) => {
        if (cancelled) return;
        setRows(roomTypeRows);
        setCategories(categoryRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof RoomTypesApiError ? err.message : "Failed to load");
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
    if (categoryFilter !== "all") result = result.filter((r) => String(r.roomCategoryKey) === categoryFilter);
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
  }, [rows, search, categoryFilter, statusFilter, sortKey, sortDirection]);

  function upsertLocal(row: RoomType) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [...prev, row] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(row: RoomType) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setRoomTypeActive(row.roomTypeKey, !row.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof RoomTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: RoomType) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteRoomType(row.roomTypeKey, actorKey);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Room type deleted");
    } catch (error) {
      toast.error(error instanceof RoomTypesApiError ? error.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Room Type"
        description="Global lookup of individual room types (Standard King Room, Deluxe Sea View Room, …), grouped by category."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              disabled={categories.length === 0}
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add room type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a Room Category first before adding room types.
        </p>
      )}

      {panelMode !== "closed" && (
        <RoomTypePanel
          mode={panelMode}
          row={target}
          rows={rows}
          categories={categories}
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
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All categories";
                  return categories.find((c) => String(c.roomCategoryKey) === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.roomCategoryKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            icon={Home}
            tone="primary"
            heading="No room types yet"
            description="Add your first entry (e.g. Standard King Room, Executive Suite)."
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
                <TableHead>Category</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {row.roomCategoryName ?? categories.find((c) => c.roomCategoryKey === row.roomCategoryKey)?.name ?? "—"}
                  </TableCell>
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

export default function RoomTypeMasterPage() {
  return <AccessGate module="roomType">{(roleDef) => <RoomTypeList roleDef={roleDef} />}</AccessGate>;
}
