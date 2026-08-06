"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Store, MoreHorizontal, X, Search } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createSupplierType,
  deleteSupplierType,
  listSupplierTypes,
  setSupplierTypeActive,
  updateSupplierType,
  SupplierTypesApiError,
} from "@/lib/services/supplier-types.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { RoleDef, SupplierTypeMaster } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "name";
type StatusFilter = "all" | "active" | "inactive";

function useTypeSchema(types: SupplierTypeMaster[], currentId?: string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, "Supplier type is required")
      .max(150, "Must be 150 characters or fewer")
      .refine(
        (value) =>
          !types.some((t) => t.id !== currentId && t.name.toLowerCase() === value.trim().toLowerCase()),
        "This supplier type already exists"
      ),
  });
}

type FormValues = z.infer<ReturnType<typeof useTypeSchema>>;

function TypePanel({
  mode,
  type,
  types,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  type?: SupplierTypeMaster;
  types: SupplierTypeMaster[];
  actorKey: number;
  onSaved: (type: SupplierTypeMaster) => void;
  onClose: () => void;
}) {
  const schema = useTypeSchema(types, type?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: type?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    try {
      if (mode === "edit" && type) {
        const saved = await updateSupplierType(type.typeKey, {
          supplierTypeName: values.name.trim(),
          isActive: type.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Supplier type updated");
      } else if (mode === "create") {
        const created = await createSupplierType({
          supplierTypeName: values.name.trim(),
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Supplier type created");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof SupplierTypesApiError ? error.message : "Could not save supplier type"
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create"
            ? "Add supplier type"
            : mode === "edit"
              ? "Edit supplier type"
              : "Supplier type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name" required>
            Supplier type
          </Label>
          <Input
            id="name"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. DMC, Hotelier, Tour Operator"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {mode === "view" && type && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={type.isActive ? "default" : "secondary"}>
                {type.isActive ? "active" : "inactive"}
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

function TypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [types, setTypes] = useState<SupplierTypeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<SupplierTypeMaster | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "supplierType", "edit");
  const canCreate = can(roleDef, "supplierType", "create");
  const canDelete = can(roleDef, "supplierType", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSupplierTypes()
      .then((rows) => {
        if (cancelled) return;
        setTypes(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof SupplierTypesApiError ? err.message : "Failed to load");
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

  const visibleTypes = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = types;
    if (term) result = result.filter((t) => t.name.toLowerCase().includes(term));
    if (statusFilter !== "all") {
      result = result.filter((t) => (statusFilter === "active" ? t.isActive : !t.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [types, search, statusFilter, sortKey, sortDirection]);

  function upsertLocal(type: SupplierTypeMaster) {
    setTypes((prev) => {
      const idx = prev.findIndex((t) => t.id === type.id);
      return idx === -1 ? [...prev, type] : prev.map((t, i) => (i === idx ? type : t));
    });
  }

  async function toggleActive(type: SupplierTypeMaster) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setSupplierTypeActive(type.typeKey, !type.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeType(type: SupplierTypeMaster) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteSupplierType(type.typeKey, actorKey);
      setTypes((prev) => prev.filter((t) => t.id !== type.id));
      toast.success("Supplier type deleted");
    } catch (error) {
      toast.error(error instanceof SupplierTypesApiError ? error.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier Type"
        description="Global lookup used to classify suppliers (DMC, Hotelier, Tour Operator, …)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {panelMode !== "closed" && (
        <TypePanel
          mode={panelMode}
          type={target}
          types={types}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {types.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search…"
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
        {!loading && types.length === 0 ? (
          <EmptyState
            icon={Store}
            tone="primary"
            heading="No supplier types yet"
            description="Add your first entry (e.g. DMC, Hotelier)."
            size="compact"
          />
        ) : visibleTypes.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching entries"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTypes.map((type, index) => (
                <TableRow key={type.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? "default" : "secondary"}>
                      {type.isActive ? "active" : "inactive"}
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
                            setTarget(type);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(type);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(type)}>
                              {type.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeType(type)}>Delete</DropdownMenuItem>
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

export default function SupplierTypeMasterPage() {
  return <AccessGate module="supplierType">{(roleDef) => <TypeList roleDef={roleDef} />}</AccessGate>;
}
