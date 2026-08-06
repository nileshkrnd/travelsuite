"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Plus, MoreHorizontal, X, Search } from "lucide-react";
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
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can, type ModuleKey } from "@/config/permissions";
import type { GlobalNameLookup, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

export type GlobalNameMasterService<T extends GlobalNameLookup> = {
  list: (options?: { activeOnly?: boolean }) => Promise<T[]>;
  create: (input: { name: string; isActive?: boolean; createdBy: number }) => Promise<T>;
  update: (
    key: number,
    input: { name: string; isActive?: boolean; modifiedBy: number }
  ) => Promise<T>;
  setActive: (key: number, isActive: boolean, modifiedBy: number) => Promise<T>;
  remove: (key: number) => Promise<void>;
  ApiError: new (message: string, status: number) => Error;
};

export type GlobalNameMasterConfig<T extends GlobalNameLookup> = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  entityLabel: string;
  nameLabel: string;
  namePlaceholder?: string;
  icon: LucideIcon;
  addButtonLabel: string;
  service: GlobalNameMasterService<T>;
};

export function GlobalNameMasterPage<T extends GlobalNameLookup>({
  config,
}: {
  config: GlobalNameMasterConfig<T>;
}) {
  return (
    <AccessGate module={config.moduleKey}>
      {(roleDef) => <MasterList roleDef={roleDef} config={config} />}
    </AccessGate>
  );
}

function useNameSchema<T extends GlobalNameLookup>(rows: T[], entityLabel: string, currentKey?: number) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, `${entityLabel} name is required`)
      .max(100, "Must be 100 characters or fewer")
      .refine(
        (value) =>
          !rows.some((r) => r.key !== currentKey && r.name.toLowerCase() === value.trim().toLowerCase()),
        `This ${entityLabel.toLowerCase()} already exists`
      ),
  });
}

function MasterList<T extends GlobalNameLookup>({
  roleDef,
  config,
}: {
  roleDef: RoleDef;
  config: GlobalNameMasterConfig<T>;
}) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<T | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, config.moduleKey, "edit");
  const canCreate = can(roleDef, config.moduleKey, "create");
  const canDelete = can(roleDef, config.moduleKey, "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const Icon = config.icon;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    config.service
      .list()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof config.service.ApiError ? err.message : "Failed to load");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSort(key: "name") {
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
    if (term) result = result.filter((r) => r.name.toLowerCase().includes(term));
    if (statusFilter !== "all") {
      result = result.filter((r) => (statusFilter === "active" ? r.isActive : !r.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  function upsertLocal(row: T) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [...prev, row] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(row: T) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await config.service.setActive(row.key, !row.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof config.service.ApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: T) {
    try {
      await config.service.remove(row.key);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success(`${config.entityLabel} deleted`);
    } catch (error) {
      toast.error(
        error instanceof config.service.ApiError
          ? error.message
          : `Could not delete ${config.entityLabel.toLowerCase()}`
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              {config.addButtonLabel}
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading {config.title.toLowerCase()}…</p>}

      {panelMode !== "closed" && (
        <MasterPanel
          mode={panelMode}
          row={target}
          rows={rows}
          actorKey={actorKey}
          config={config}
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
              placeholder="Search name…"
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
            icon={Icon}
            tone="primary"
            heading={`No ${config.title.toLowerCase()} yet`}
            description={`Add your first ${config.entityLabel.toLowerCase()}.`}
            size="compact"
          />
        ) : visible.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading={`No matching ${config.title.toLowerCase()}`}
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
              {visible.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
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

function MasterPanel<T extends GlobalNameLookup>({
  mode,
  row,
  rows,
  actorKey,
  config,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: T;
  rows: T[];
  actorKey: number;
  config: GlobalNameMasterConfig<T>;
  onSaved: (row: T) => void;
  onClose: () => void;
}) {
  const isReadOnly = mode === "view";
  const schema = useNameSchema(rows, config.entityLabel, row?.key);
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: row?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        const saved = await config.service.update(row.key, {
          name: values.name.trim(),
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success(`${config.entityLabel} updated`);
      } else if (mode === "create") {
        const created = await config.service.create({
          name: values.name.trim(),
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success(`${config.entityLabel} created`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof config.service.ApiError
          ? error.message
          : `Could not save ${config.entityLabel.toLowerCase()}`
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create"
            ? `Add ${config.entityLabel.toLowerCase()}`
            : mode === "edit"
              ? `Edit ${config.entityLabel.toLowerCase()}`
              : `${config.entityLabel} details`}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name" required>
            {config.nameLabel}
          </Label>
          <Input
            id="name"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder={config.namePlaceholder}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
