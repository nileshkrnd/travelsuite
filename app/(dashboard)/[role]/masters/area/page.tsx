"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, LandPlot, MoreHorizontal, X, Search } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createArea,
  deleteArea,
  listAreas,
  setAreaActive,
  updateArea,
  AreasApiError,
} from "@/lib/services/areas.service";
import { listAreaTypes } from "@/lib/services/area-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { Area, AreaType, City, Country, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "cityName";
type StatusFilter = "all" | "active" | "inactive";

function useAreaSchema(areas: Area[], currentId?: string) {
  return z.object({
    countryId: z.number().int().positive("Country is required"),
    cityId: z.number().int().positive("City is required"),
    code: z
      .string()
      .trim()
      .min(1, "Area code is required")
      .max(30, "Area code must be 30 characters or fewer")
      .refine(
        (value) =>
          !areas.some((a) => a.id !== currentId && a.code.toLowerCase() === value.trim().toLowerCase()),
        "This area code is already in use for the selected city"
      ),
    name: z.string().trim().min(1, "Area name is required").max(150),
    nativeName: z.string().trim().max(150).optional().or(z.literal("")),
    areaTypeId: z.number().int().positive().optional(),
    latitude: z.string().trim().optional().or(z.literal("")),
    longitude: z.string().trim().optional().or(z.literal("")),
    googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
    displayOrder: z.string().trim().optional().or(z.literal("")),
    isPopular: z.boolean().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof useAreaSchema>>;

function AreaPanel({
  mode,
  area,
  areas,
  countries,
  areaTypes,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  area?: Area;
  areas: Area[];
  countries: Country[];
  areaTypes: AreaType[];
  actorKey: number;
  onSaved: (area: Area) => void;
  onClose: () => void;
}) {
  const schema = useAreaSchema(areas, area?.id);
  const isReadOnly = mode === "view";
  const [cities, setCities] = useState<City[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      countryId: area?.countryKey ?? 0,
      cityId: area?.cityKey ?? 0,
      code: area?.code ?? "",
      name: area?.name ?? "",
      nativeName: area?.nativeName ?? "",
      areaTypeId: area?.areaTypeKey ?? undefined,
      latitude: area?.latitude != null ? String(area.latitude) : "",
      longitude: area?.longitude != null ? String(area.longitude) : "",
      googlePlaceId: area?.googlePlaceId ?? "",
      displayOrder: area?.displayOrder != null ? String(area.displayOrder) : "",
      isPopular: area?.isPopular ?? false,
    },
  });

  const countryId = useWatch({ control, name: "countryId" });

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setCities(rows);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving areas.");
      return;
    }

    const payload = {
      countryId: values.countryId,
      cityId: values.cityId,
      areaCode: values.code.trim(),
      areaName: values.name.trim(),
      nativeName: values.nativeName?.trim() || undefined,
      areaTypeId: values.areaTypeId ?? null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
      googlePlaceId: values.googlePlaceId?.trim() || undefined,
      displayOrder: values.displayOrder?.trim() ? Number(values.displayOrder) : 0,
      isPopular: values.isPopular ?? false,
    };

    try {
      if (mode === "edit" && area) {
        const saved = await updateArea(area.areaKey, {
          ...payload,
          isActive: area.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Area updated");
      } else if (mode === "create") {
        const created = await createArea({ ...payload, createdBy: actorKey });
        onSaved(created);
        toast.success("Area created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof AreasApiError ? error.message : "Could not save area");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add area" : mode === "edit" ? "Edit area" : "Area details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(Number(v));
                  setValue("cityId", 0, { shouldValidate: true });
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.countryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select country";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>City</Label>
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || !countryId || cities.length === 0}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.cityId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return !countryId ? "Select a country first" : "Select city";
                      return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={String(c.cityKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.cityId && <p className="text-sm text-destructive">{errors.cityId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="areaCode" required>
            Area code
          </Label>
          <Input
            id="areaCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            placeholder="e.g. MARINA, BANDRA"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="areaName" required>
            Area name
          </Label>
          <Input id="areaName" disabled={isReadOnly} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nativeName">Native name</Label>
          <Input id="nativeName" disabled={isReadOnly} {...register("nativeName")} />
        </div>

        <div className="space-y-2">
          <Label>Area type</Label>
          <Controller
            control={control}
            name="areaTypeId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return areaTypes.find((t) => String(t.typeKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areaTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.typeKey)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" disabled={isReadOnly} placeholder="e.g. 25.197197" {...register("latitude")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" disabled={isReadOnly} placeholder="e.g. 55.274376" {...register("longitude")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="googlePlaceId">Google Place ID</Label>
          <Input id="googlePlaceId" disabled={isReadOnly} {...register("googlePlaceId")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Controller
            control={control}
            name="isPopular"
            render={({ field }) => (
              <Checkbox
                id="isPopular"
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isReadOnly}
              />
            )}
          />
          <Label htmlFor="isPopular" className="cursor-pointer">
            Featured / popular area
          </Label>
        </div>

        {mode === "view" && area && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={area.isActive ? "default" : "secondary"}>{area.isActive ? "active" : "inactive"}</Badge>
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

function AreaList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [areas, setAreas] = useState<Area[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Area | undefined>();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "area", "edit");
  const canCreate = can(roleDef, "area", "create");
  const canDelete = can(roleDef, "area", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAreas(), listCountries(), listAreaTypes()])
      .then(([areaRows, countryRows, typeRows]) => {
        if (cancelled) return;
        setAreas(areaRows);
        setCountries(countryRows);
        setAreaTypes(typeRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof AreasApiError ? err.message : "Failed to load areas");
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

  const visibleAreas = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = areas;
    if (countryFilter !== "all") {
      const key = Number(countryFilter);
      result = result.filter((a) => a.countryKey === key);
    }
    if (term) {
      result = result.filter(
        (a) => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((a) => (statusFilter === "active" ? a.isActive : !a.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [areas, search, countryFilter, statusFilter, sortKey, sortDirection]);

  function upsertLocal(area: Area) {
    setAreas((prev) => {
      const idx = prev.findIndex((a) => a.id === area.id);
      return idx === -1 ? [...prev, area] : prev.map((a, i) => (i === idx ? area : a));
    });
  }

  async function toggleActive(area: Area) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setAreaActive(area.areaKey, !area.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Area activated" : "Area deactivated");
    } catch (error) {
      toast.error(error instanceof AreasApiError ? error.message : "Could not update status");
    }
  }

  async function removeArea(area: Area) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteArea(area.areaKey, actorKey);
      setAreas((prev) => prev.filter((a) => a.id !== area.id));
      toast.success("Area deleted");
    } catch (error) {
      toast.error(error instanceof AreasApiError ? error.message : "Could not delete area");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Area"
        description="Global area/locality master used across cities (not company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add area
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading areas…</p>}

      {panelMode !== "closed" && (
        <AreaPanel
          mode={panelMode}
          area={target}
          areas={areas}
          countries={countries}
          areaTypes={areaTypes}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {areas.length > 0 && (
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
          <Select value={countryFilter} onValueChange={(value) => setCountryFilter(value ?? "all")}>
            <SelectTrigger className="w-52">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === "all") return "All countries";
                  return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.id} value={String(c.countryKey)}>
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
        {!loading && areas.length === 0 ? (
          <EmptyState
            icon={LandPlot}
            tone="primary"
            heading="No areas yet"
            description="Add your first area or locality to get started."
            size="compact"
          />
        ) : visibleAreas.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching areas"
            description="Try a different search term, country, or status filter."
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
                  sortKey="cityName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  City
                </SortableTableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAreas.map((area, index) => (
                <TableRow key={area.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{area.code}</TableCell>
                  <TableCell>
                    {area.name}
                    {area.isPopular && (
                      <Badge variant="outline" className="ml-2">
                        featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{area.cityName}</TableCell>
                  <TableCell className="text-muted-foreground">{area.areaTypeName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={area.isActive ? "default" : "secondary"}>
                      {area.isActive ? "active" : "inactive"}
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
                            setTarget(area);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(area);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(area)}>
                              {area.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeArea(area)}>Delete</DropdownMenuItem>
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

export default function AreaMasterPage() {
  return <AccessGate module="area">{(roleDef) => <AreaList roleDef={roleDef} />}</AccessGate>;
}
