"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Wifi, MoreHorizontal, X, Search, CheckCircle2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createAmenity,
  deleteAmenity,
  listAmenities,
  setAmenityActive,
  updateAmenity,
  AmenitiesApiError,
} from "@/lib/services/amenities.service";
import { listAmenityFacilityCategories } from "@/lib/services/amenity-facility-categories.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import type { Amenity, AmenityFacilityCategory, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "name" | "code" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useAmenitySchema(rows: Amenity[], currentId?: string) {
  return z.object({
    categoryId: z.number().int().positive("Select a category"),
    code: z
      .string()
      .trim()
      .min(1, "Amenity code is required")
      .max(50, "Must be 50 characters or fewer")
      .refine(
        (value) =>
          !rows.some((r) => r.id !== currentId && r.code.toLowerCase() === value.trim().toLowerCase()),
        "This amenity code already exists"
      ),
    name: z.string().trim().min(1, "Amenity name is required").max(250, "Must be 250 characters or fewer"),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    icon: z.string().trim().max(255).optional().or(z.literal("")),
    isFilterable: z.boolean(),
    displayOrder: z.preprocess(
      (v) => (v === "" || v == null ? 0 : Number(v)),
      z.number().int().min(0)
    ),
  });
}

type FormValues = z.infer<ReturnType<typeof useAmenitySchema>>;

function IconPreview({ name }: { name: string | undefined }) {
  const Icon = name ? ICONS[name] : undefined;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-muted/40 text-muted-foreground">
      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs">—</span>}
    </div>
  );
}

function AmenityPanel({
  mode,
  row,
  rows,
  categories,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: Amenity;
  rows: Amenity[];
  categories: AmenityFacilityCategory[];
  actorKey: number;
  onSaved: (row: Amenity) => void;
  onClose: () => void;
}) {
  const schema = useAmenitySchema(rows, row?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      categoryId: row?.categoryKey ?? categories[0]?.categoryKey ?? 0,
      code: row?.code ?? "",
      name: row?.name ?? "",
      description: row?.description ?? "",
      icon: row?.icon ?? "",
      isFilterable: row?.isFilterable ?? false,
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  const iconWatch = watch("icon");

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        const saved = await updateAmenity(row.amenityKey, {
          amenityFacilityCategoryId: values.categoryId,
          amenityCode: values.code.trim(),
          amenityName: values.name.trim(),
          description: values.description?.trim() || null,
          icon: values.icon?.trim() || null,
          isFilterable: values.isFilterable,
          displayOrder: values.displayOrder,
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Amenity updated");
      } else if (mode === "create") {
        const created = await createAmenity({
          amenityFacilityCategoryId: values.categoryId,
          amenityCode: values.code.trim(),
          amenityName: values.name.trim(),
          description: values.description?.trim() || null,
          icon: values.icon?.trim() || null,
          isFilterable: values.isFilterable,
          displayOrder: values.displayOrder,
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Amenity created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof AmenitiesApiError ? error.message : "Could not save amenity");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add amenity" : mode === "edit" ? "Edit amenity" : "Amenity details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label required>Category</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.categoryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select category";
                      return categories.find((c) => String(c.categoryKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.categoryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code" required>
            Amenity code
          </Label>
          <Input
            id="code"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. WIFI"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Amenity name
          </Label>
          <Input
            id="name"
            disabled={isReadOnly}
            placeholder="e.g. Free WiFi"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="icon">Icon</Label>
          <div className="flex items-center gap-2">
            <IconPreview name={iconWatch} />
            <Input
              id="icon"
              disabled={isReadOnly}
              placeholder="e.g. Wifi"
              list="amenity-icon-options"
              {...register("icon")}
            />
            <datalist id="amenity-icon-options">
              {ICON_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-muted-foreground">Lucide icon name — start typing to see matches.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>
        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isFilterable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(c) => field.onChange(c === true)}
                  disabled={isReadOnly}
                />
                Used in search filter
              </label>
            )}
          />
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

function AmenityList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<Amenity[]>([]);
  const [categories, setCategories] = useState<AmenityFacilityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Amenity | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "amenity", "edit");
  const canCreate = can(roleDef, "amenity", "create");
  const canDelete = can(roleDef, "amenity", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAmenities(), listAmenityFacilityCategories({ activeOnly: true })])
      .then(([amenityRows, categoryRows]) => {
        if (cancelled) return;
        setRows(amenityRows);
        setCategories(categoryRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof AmenitiesApiError ? err.message : "Failed to load");
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
    if (categoryFilter !== "all") result = result.filter((r) => String(r.categoryKey) === categoryFilter);
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

  function upsertLocal(row: Amenity) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [...prev, row] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(row: Amenity) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setAmenityActive(row.amenityKey, !row.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof AmenitiesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: Amenity) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteAmenity(row.amenityKey, actorKey);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Amenity deleted");
    } catch (error) {
      toast.error(error instanceof AmenitiesApiError ? error.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Amenity"
        description="Global lookup of individual amenities and facilities (WiFi, TV, Mini Bar, …), grouped by category."
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
              Add amenity
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create an Amenity/Facility Category first before adding amenities.
        </p>
      )}

      {panelMode !== "closed" && (
        <AmenityPanel
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
                  return categories.find((c) => String(c.categoryKey) === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.categoryKey)}>
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
            icon={Wifi}
            tone="primary"
            heading="No amenities yet"
            description="Add your first entry (e.g. Free WiFi, Television)."
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
                <TableHead>Filterable</TableHead>
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
              {visible.map((row, index) => {
                const Icon = row.icon ? ICONS[row.icon] : undefined;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.code}</TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.categoryName ?? categories.find((c) => c.categoryKey === row.categoryKey)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.isFilterable && <CheckCircle2 className="h-4 w-4 text-primary" />}
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function AmenityMasterPage() {
  return <AccessGate module="amenity">{(roleDef) => <AmenityList roleDef={roleDef} />}</AccessGate>;
}
