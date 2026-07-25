"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Tags, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import {
  listAirlineTypes,
  createAirlineType,
  updateAirlineType,
  setAirlineTypeActive,
  deleteAirlineType,
  AirlineTypesApiError,
} from "@/lib/services/airline-types.service";
import { can } from "@/config/permissions";
import type { AirlineType, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "airlineTypeName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

function useSchema(rows: AirlineType[], currentId?: number) {
  return z.object({
    airlineTypeName: z
      .string()
      .min(1, "Airline type name is required")
      .max(100)
      .refine(
        (value) =>
          !rows.some(
            (r) =>
              r.airlineTypeId !== currentId &&
              r.airlineTypeName.toLowerCase() === value.trim().toLowerCase()
          ),
        "This airline type name already exists"
      ),
  });
}

type FormValues = z.infer<ReturnType<typeof useSchema>>;

function Panel({
  mode,
  row,
  rows,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: AirlineType;
  rows: AirlineType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useSchema(rows, row?.airlineTypeId);
  const isReadOnly = mode === "view";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { airlineTypeName: row?.airlineTypeName ?? "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && row) {
        await updateAirlineType(row.airlineTypeId, {
          airlineTypeName: values.airlineTypeName.trim(),
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Airline type updated");
      } else if (mode === "create") {
        await createAirlineType({
          airlineTypeName: values.airlineTypeName.trim(),
          createdBy: userKey,
        });
        toast.success("Airline type created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof AirlineTypesApiError ? error.message : "Could not save");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add airline type" : mode === "edit" ? "Edit airline type" : "Airline type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="airlineTypeName" required>
            Airline type name
          </Label>
          <Input id="airlineTypeName" autoFocus={!isReadOnly} disabled={isReadOnly} {...register("airlineTypeName")} />
          {errors.airlineTypeName && (
            <p className="text-sm text-destructive">{errors.airlineTypeName.message}</p>
          )}
        </div>
        {mode === "view" && row && (
          <div className="sm:col-span-2">
            <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
          </div>
        )}
        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
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

function List({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<AirlineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<AirlineType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "airlineType", "edit");
  const canCreate = can(roleDef, "airlineType", "create");
  const canDelete = can(roleDef, "airlineType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await listAirlineTypes());
    } catch (error) {
      setLoadError(error instanceof AirlineTypesApiError ? error.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) result = result.filter((r) => r.airlineTypeName.toLowerCase().includes(term));
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Airline Type"
        description="Global airline type master — Super Admin Tenant Configuration."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add airline type
            </Button>
          ) : undefined
        }
      />
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {panelMode !== "closed" && (
        <Panel
          mode={panelMode}
          row={target}
          rows={rows}
          userKey={userKey}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "all")}>
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
          <EmptyState icon={Tags} tone="primary" heading="No airline types yet" description="Add the first airline type." size="compact" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="airlineTypeName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={(k) => {
                    if (sortKey === k) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(k);
                      setSortDirection("asc");
                    }
                  }}
                >
                  Name
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.airlineTypeId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.airlineTypeName}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
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
                            <DropdownMenuItem
                              onClick={() =>
                                void setAirlineTypeActive(row.airlineTypeId, !row.isActive, userKey)
                                  .then(refresh)
                                  .then(() => toast.success(row.isActive ? "Deactivated" : "Activated"))
                                  .catch((e) =>
                                    toast.error(e instanceof AirlineTypesApiError ? e.message : "Update failed")
                                  )
                              }
                            >
                              {row.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() =>
                              void deleteAirlineType(row.airlineTypeId)
                                .then(refresh)
                                .then(() => toast.success("Deleted"))
                                .catch((e) =>
                                  toast.error(e instanceof AirlineTypesApiError ? e.message : "Delete failed")
                                )
                            }
                          >
                            Delete
                          </DropdownMenuItem>
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

export default function AirlineTypeMasterPage() {
  return <AccessGate module="airlineType">{(roleDef) => <List roleDef={roleDef} />}</AccessGate>;
}
