"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Landmark, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
  listRegions,
  createRegion,
  updateRegion,
  setRegionStatus,
  deleteRegion,
  RegionsApiError,
} from "@/lib/services/regions.service";
import { can } from "@/config/permissions";
import type { Region, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "regionCode" | "regionName" | "status" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

function useRegionSchema(regions: Region[], currentId?: number) {
  return z.object({
    regionCode: z
      .string()
      .min(1, "Region code is required")
      .max(100, "Region code must be 100 characters or fewer")
      .refine(
        (value) =>
          !regions.some(
            (r) => r.regionId !== currentId && r.regionCode.toLowerCase() === value.trim().toLowerCase()
          ),
        "This region code is already in use"
      ),
    regionName: z
      .string()
      .min(1, "Region name is required")
      .max(200, "Region name must be 200 characters or fewer"),
  });
}

type FormValues = z.infer<ReturnType<typeof useRegionSchema>>;

function RegionPanel({
  mode,
  region,
  regions,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  region?: Region;
  regions: Region[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useRegionSchema(regions, region?.regionId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      regionCode: region?.regionCode ?? "",
      regionName: region?.regionName ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && region) {
        await updateRegion(region.regionId, {
          regionCode: values.regionCode.trim(),
          regionName: values.regionName.trim(),
          status: region.status,
          modifiedBy: userKey,
        });
        toast.success("Region updated");
      } else if (mode === "create") {
        await createRegion({
          regionCode: values.regionCode.trim(),
          regionName: values.regionName.trim(),
          createdBy: userKey,
        });
        toast.success("Region created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof RegionsApiError ? error.message : "Could not save region");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add region" : mode === "edit" ? "Edit region" : "Region details"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regionCode" required>
            Region code
          </Label>
          <Input
            id="regionCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly || mode === "edit"}
            aria-invalid={!!errors.regionCode}
            {...register("regionCode")}
          />
          {errors.regionCode && <p className="text-sm text-destructive">{errors.regionCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regionName" required>
            Region name
          </Label>
          <Input
            id="regionName"
            disabled={isReadOnly}
            aria-invalid={!!errors.regionName}
            {...register("regionName")}
          />
          {errors.regionName && <p className="text-sm text-destructive">{errors.regionName.message}</p>}
        </div>

        {mode === "view" && region && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={region.status === "active" ? "default" : "secondary"}>{region.status}</Badge>
            </div>
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

function RegionList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Region | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "region", "edit");
  const canCreate = can(roleDef, "region", "create");
  const canDelete = can(roleDef, "region", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setRegions(await listRegions());
    } catch (error) {
      setLoadError(error instanceof RegionsApiError ? error.message : "Failed to load regions");
      setRegions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleRegions = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = regions;
    if (term) {
      result = result.filter(
        (r) => r.regionCode.toLowerCase().includes(term) || r.regionName.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [regions, search, statusFilter, sortKey, sortDirection]);

  async function toggleStatus(region: Region) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setRegionStatus(
        region.regionId,
        region.status === "active" ? "inactive" : "active",
        userKey
      );
      await refresh();
      toast.success(region.status === "active" ? "Region deactivated" : "Region activated");
    } catch (error) {
      toast.error(error instanceof RegionsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRegion(region: Region) {
    try {
      await deleteRegion(region.regionId);
      await refresh();
      toast.success("Region deleted");
    } catch (error) {
      toast.error(error instanceof RegionsApiError ? error.message : "Could not delete region");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Region"
        description="Global region master used across all tenants (not company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add region
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading regions…</p>}

      {panelMode !== "closed" && (
        <RegionPanel
          mode={panelMode}
          region={target}
          regions={regions}
          userKey={userKey}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {regions.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name…"
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
        {!loading && regions.length === 0 ? (
          <EmptyState
            icon={Landmark}
            tone="primary"
            heading="No regions yet"
            description="Add your first region to get started."
            size="compact"
          />
        ) : visibleRegions.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching regions"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="regionCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="regionName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Name
                </SortableTableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRegions.map((region, index) => (
                <TableRow key={region.regionId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{region.regionCode}</TableCell>
                  <TableCell>{region.regionName}</TableCell>
                  <TableCell>
                    <Badge variant={region.status === "active" ? "default" : "secondary"}>{region.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setTarget(region);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(region);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(region)}>
                              {region.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeRegion(region)}>Delete</DropdownMenuItem>
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

export default function RegionMasterPage() {
  return <AccessGate module="region">{(roleDef) => <RegionList roleDef={roleDef} />}</AccessGate>;
}
