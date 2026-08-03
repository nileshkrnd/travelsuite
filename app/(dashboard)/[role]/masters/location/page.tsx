"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pin, MoreHorizontal, X, Search } from "lucide-react";
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
  createLocation,
  deleteLocation,
  listLocations,
  setLocationActive,
  updateLocation,
  LocationsApiError,
} from "@/lib/services/locations.service";
import { listLocationTypes } from "@/lib/services/location-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listStates } from "@/lib/services/states.service";
import { listAreas } from "@/lib/services/areas.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { Area, City, Country, Location, LocationType, RoleDef, State } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "areaName";
type StatusFilter = "all" | "active" | "inactive";

function useLocationSchema(locations: Location[], currentId?: string) {
  return z.object({
    countryId: z.number().int().positive("Country is required"),
    stateId: z.number().int().positive().optional(),
    cityId: z.number().int().positive("City is required"),
    areaId: z.number().int().positive("Area is required"),
    code: z
      .string()
      .trim()
      .min(1, "Location code is required")
      .max(30, "Location code must be 30 characters or fewer")
      .refine(
        (value) =>
          !locations.some((l) => l.id !== currentId && l.code.toLowerCase() === value.trim().toLowerCase()),
        "This location code is already in use for the selected area"
      ),
    name: z.string().trim().min(1, "Location name is required").max(150),
    nativeName: z.string().trim().max(150).optional().or(z.literal("")),
    locationTypeId: z.number().int().positive().optional(),
    zoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
    latitude: z.string().trim().optional().or(z.literal("")),
    longitude: z.string().trim().optional().or(z.literal("")),
    googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
    displayOrder: z.string().trim().optional().or(z.literal("")),
    isPopular: z.boolean().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof useLocationSchema>>;

function LocationPanel({
  mode,
  location,
  locations,
  countries,
  locationTypes,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  location?: Location;
  locations: Location[];
  countries: Country[];
  locationTypes: LocationType[];
  actorKey: number;
  onSaved: (location: Location) => void;
  onClose: () => void;
}) {
  const schema = useLocationSchema(locations, location?.id);
  const isReadOnly = mode === "view";
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      countryId: location?.countryKey ?? 0,
      stateId: location?.stateKey ?? undefined,
      cityId: location?.cityKey ?? 0,
      areaId: location?.areaKey ?? 0,
      code: location?.code ?? "",
      name: location?.name ?? "",
      nativeName: location?.nativeName ?? "",
      locationTypeId: location?.locationTypeKey ?? undefined,
      zoneNumber: location?.zoneNumber ?? "",
      latitude: location?.latitude != null ? String(location.latitude) : "",
      longitude: location?.longitude != null ? String(location.longitude) : "",
      googlePlaceId: location?.googlePlaceId ?? "",
      displayOrder: location?.displayOrder != null ? String(location.displayOrder) : "",
      isPopular: location?.isPopular ?? false,
    },
  });

  const countryId = useWatch({ control, name: "countryId" });
  const cityId = useWatch({ control, name: "cityId" });

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    let cancelled = false;
    listStates({ countryId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setStates(rows);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
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

  useEffect(() => {
    if (!cityId) {
      setAreas([]);
      return;
    }
    let cancelled = false;
    listAreas({ cityId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setAreas(rows);
      })
      .catch(() => {
        if (!cancelled) setAreas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving locations.");
      return;
    }

    const payload = {
      countryId: values.countryId,
      stateId: values.stateId ?? null,
      cityId: values.cityId,
      areaId: values.areaId,
      locationCode: values.code.trim(),
      locationName: values.name.trim(),
      nativeName: values.nativeName?.trim() || undefined,
      locationTypeId: values.locationTypeId ?? null,
      zoneNumber: values.zoneNumber?.trim() || undefined,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
      googlePlaceId: values.googlePlaceId?.trim() || undefined,
      displayOrder: values.displayOrder?.trim() ? Number(values.displayOrder) : 0,
      isPopular: values.isPopular ?? false,
    };

    try {
      if (mode === "edit" && location) {
        const saved = await updateLocation(location.locationKey, {
          ...payload,
          isActive: location.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Location updated");
      } else if (mode === "create") {
        const created = await createLocation({ ...payload, createdBy: actorKey });
        onSaved(created);
        toast.success("Location created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof LocationsApiError ? error.message : "Could not save location");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add location" : mode === "edit" ? "Edit location" : "Location details"}
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
                  setValue("stateId", undefined);
                  setValue("cityId", 0, { shouldValidate: true });
                  setValue("areaId", 0, { shouldValidate: true });
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
          <Label>State</Label>
          <Controller
            control={control}
            name="stateId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                disabled={isReadOnly || !countryId || states.length === 0}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return !countryId ? "Select a country first" : "Select state (optional)";
                      return states.find((s) => String(s.stateKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={String(s.stateKey)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label required>City</Label>
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(Number(v));
                  setValue("areaId", 0, { shouldValidate: true });
                }}
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
          <Label required>Area</Label>
          <Controller
            control={control}
            name="areaId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || !cityId || areas.length === 0}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.areaId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return !cityId ? "Select a city first" : "Select area";
                      return areas.find((a) => String(a.areaKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={String(a.areaKey)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.areaId && <p className="text-sm text-destructive">{errors.areaId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationCode" required>
            Location code
          </Label>
          <Input
            id="locationCode"
            disabled={isReadOnly}
            placeholder="e.g. PALM01, ZONE55"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationName" required>
            Location name
          </Label>
          <Input id="locationName" disabled={isReadOnly} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nativeName">Native name</Label>
          <Input id="nativeName" disabled={isReadOnly} {...register("nativeName")} />
        </div>

        <div className="space-y-2">
          <Label>Location type</Label>
          <Controller
            control={control}
            name="locationTypeId"
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
                      return locationTypes.find((t) => String(t.typeKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((t) => (
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
          <Label htmlFor="zoneNumber">Zone number</Label>
          <Input id="zoneNumber" disabled={isReadOnly} placeholder="e.g. 55 (Qatar zone)" {...register("zoneNumber")} />
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
            Featured / popular location
          </Label>
        </div>

        {mode === "view" && location && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={location.isActive ? "default" : "secondary"}>
                {location.isActive ? "active" : "inactive"}
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

function LocationList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [locations, setLocations] = useState<Location[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Location | undefined>();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "location", "edit");
  const canCreate = can(roleDef, "location", "create");
  const canDelete = can(roleDef, "location", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listLocations(), listCountries(), listLocationTypes()])
      .then(([locationRows, countryRows, typeRows]) => {
        if (cancelled) return;
        setLocations(locationRows);
        setCountries(countryRows);
        setLocationTypes(typeRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof LocationsApiError ? err.message : "Failed to load locations");
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

  const visibleLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = locations;
    if (countryFilter !== "all") {
      const key = Number(countryFilter);
      result = result.filter((l) => l.countryKey === key);
    }
    if (term) {
      result = result.filter(
        (l) => l.code.toLowerCase().includes(term) || l.name.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => (statusFilter === "active" ? l.isActive : !l.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [locations, search, countryFilter, statusFilter, sortKey, sortDirection]);

  function upsertLocal(location: Location) {
    setLocations((prev) => {
      const idx = prev.findIndex((l) => l.id === location.id);
      return idx === -1 ? [...prev, location] : prev.map((l, i) => (i === idx ? location : l));
    });
  }

  async function toggleActive(location: Location) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setLocationActive(location.locationKey, !location.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Location activated" : "Location deactivated");
    } catch (error) {
      toast.error(error instanceof LocationsApiError ? error.message : "Could not update status");
    }
  }

  async function removeLocation(location: Location) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteLocation(location.locationKey, actorKey);
      setLocations((prev) => prev.filter((l) => l.id !== location.id));
      toast.success("Location deleted");
    } catch (error) {
      toast.error(error instanceof LocationsApiError ? error.message : "Could not delete location");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Location"
        description="Global location master — a subdivision of an Area (not company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add location
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading locations…</p>}

      {panelMode !== "closed" && (
        <LocationPanel
          mode={panelMode}
          location={target}
          locations={locations}
          countries={countries}
          locationTypes={locationTypes}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {locations.length > 0 && (
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
        {!loading && locations.length === 0 ? (
          <EmptyState
            icon={Pin}
            tone="primary"
            heading="No locations yet"
            description="Add your first location under an area to get started."
            size="compact"
          />
        ) : visibleLocations.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching locations"
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
                  sortKey="areaName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Area
                </SortableTableHead>
                <TableHead>City</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLocations.map((location, index) => (
                <TableRow key={location.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{location.code}</TableCell>
                  <TableCell>
                    {location.name}
                    {location.isPopular && (
                      <Badge variant="outline" className="ml-2">
                        featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{location.areaName}</TableCell>
                  <TableCell className="text-muted-foreground">{location.cityName}</TableCell>
                  <TableCell className="text-muted-foreground">{location.locationTypeName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={location.isActive ? "default" : "secondary"}>
                      {location.isActive ? "active" : "inactive"}
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
                            setTarget(location);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(location);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(location)}>
                              {location.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeLocation(location)}>Delete</DropdownMenuItem>
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

export default function LocationMasterPage() {
  return <AccessGate module="location">{(roleDef) => <LocationList roleDef={roleDef} />}</AccessGate>;
}
