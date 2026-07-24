"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Globe, MoreHorizontal, X, Search } from "lucide-react";
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
import { useRegionsStore } from "@/lib/store/regions.store";
import { can } from "@/config/permissions";
import type { Region, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "status" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function useRegionSchema(regions: Region[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .min(1, "Region code is required")
      .max(10, "Region code must be 10 characters or fewer")
      .refine(
        (value) => !regions.some((r) => r.id !== currentId && r.code.toLowerCase() === value.trim().toLowerCase()),
        "This region code is already in use"
      ),
    name: z.string().min(1, "Region name is required"),
  });
}

type FormValues = z.infer<ReturnType<typeof useRegionSchema>>;

function RegionPanel({
  mode,
  region,
  regions,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  region?: Region;
  regions: Region[];
  onClose: () => void;
}) {
  const addRegion = useRegionsStore((s) => s.addRegion);
  const updateRegion = useRegionsStore((s) => s.updateRegion);
  const schema = useRegionSchema(regions, region?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { code: region?.code ?? "", name: region?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (mode === "edit" && region) {
      updateRegion(region.id, { code: values.code.trim(), name: values.name.trim() });
      toast.success("Region updated");
    } else if (mode === "create") {
      addRegion({ code: values.code.trim(), name: values.name.trim() });
      toast.success("Region created");
    }
    onClose();
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add region" : mode === "edit" ? "Edit region" : "Region details"}
          </h2>
          {mode === "view" && region && (
            <p className="text-sm text-muted-foreground">
              Created {new Date(region.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regionCode">Region code</Label>
          <Input
            id="regionCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regionName">Region name</Label>
          <Input id="regionName" disabled={isReadOnly} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
  const regions = useRegionsStore((s) => s.regions);
  const updateRegion = useRegionsStore((s) => s.updateRegion);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Region | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "region", "edit");
  const canCreate = can(roleDef, "region", "create");

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
      result = result.filter((r) => r.code.toLowerCase().includes(term) || r.name.toLowerCase().includes(term));
    }
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [regions, search, statusFilter, sortKey, sortDirection]);

  function openCreate() {
    setTarget(undefined);
    setPanelMode("create");
  }
  function openEdit(region: Region) {
    setTarget(region);
    setPanelMode("edit");
  }
  function openView(region: Region) {
    setTarget(region);
    setPanelMode("view");
  }
  function closePanel() {
    setPanelMode("closed");
    setTarget(undefined);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Region"
        description="Geographic regions used to group your operations."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add region
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <RegionPanel mode={panelMode} region={target} regions={regions} onClose={closePanel} />
      )}

      {regions.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
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
        {regions.length === 0 ? (
          <EmptyState
            icon={Globe}
            tone="primary"
            heading="No regions yet"
            description="Add your first region to get started."
            size="compact"
          />
        ) : visibleRegions.length === 0 ? (
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
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Created
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRegions.map((region, index) => (
                <TableRow key={region.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{region.code}</TableCell>
                  <TableCell>{region.name}</TableCell>
                  <TableCell>
                    <Badge variant={region.status === "active" ? "default" : "secondary"}>{region.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(region.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(region)}>View</DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(region)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateRegion(region.id, {
                                  status: region.status === "active" ? "inactive" : "active",
                                })
                              }
                            >
                              {region.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
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
