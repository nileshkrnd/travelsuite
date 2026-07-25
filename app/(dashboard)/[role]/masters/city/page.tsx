"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPinned, MoreHorizontal, X, Search } from "lucide-react";
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
  createCity,
  listCities,
  setCityStatus,
  updateCity,
  CitiesApiError,
} from "@/lib/services/cities.service";
import { listCountries, CountriesApiError } from "@/lib/services/countries.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { City, Country, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "countryCode" | "status" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function useCitySchema(cities: City[], currentId?: string) {
  return z
    .object({
      countryId: z.number().int().positive("Country is required"),
      code: z.string().min(1, "City code is required").max(100, "City code must be 100 characters or fewer"),
      name: z.string().min(1, "City name is required"),
    })
    .superRefine((values, ctx) => {
      const duplicate = cities.some(
        (c) =>
          c.id !== currentId &&
          c.countryKey === values.countryId &&
          c.code.toLowerCase() === values.code.trim().toLowerCase()
      );
      if (duplicate) {
        ctx.addIssue({
          code: "custom",
          path: ["code"],
          message: "This city code is already in use for the selected country",
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof useCitySchema>>;

function CityPanel({
  mode,
  city,
  cities,
  countries,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  city?: City;
  cities: City[];
  countries: Country[];
  actorKey: number;
  onSaved: (city: City) => void;
  onClose: () => void;
}) {
  const schema = useCitySchema(cities, city?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      countryId: city?.countryKey ?? countries[0]?.countryKey ?? 0,
      code: city?.code ?? "",
      name: city?.name ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving cities.");
      return;
    }

    try {
      if (mode === "edit" && city) {
        const saved = await updateCity(city.cityKey, {
          countryId: values.countryId,
          cityCode: values.code.trim(),
          cityName: values.name.trim(),
          status: city.status,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("City updated");
      } else if (mode === "create") {
        const created = await createCity({
          countryId: values.countryId,
          cityCode: values.code.trim(),
          cityName: values.name.trim(),
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("City created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof CitiesApiError ? error.message : "Could not save city");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add city" : mode === "edit" ? "Edit city" : "City details"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select country";
                      const match = countries.find((c) => String(c.countryKey) === value);
                      return match ? `${match.name} (${match.code})` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.countryKey)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cityCode">City code</Label>
          <Input
            id="cityCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly || mode === "edit"}
            placeholder="e.g. DOHA"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cityName">City name</Label>
          <Input
            id="cityName"
            disabled={isReadOnly}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {mode === "view" && city && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={city.status === "active" ? "default" : "secondary"}>{city.status}</Badge>
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

function CityList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<City | undefined>();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "city", "edit");
  const canCreate = can(roleDef, "city", "create");
  const actorKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listCities(), listCountries({ activeOnly: true })])
      .then(([cityRows, countryRows]) => {
        if (cancelled) return;
        setCities(cityRows);
        setCountries(countryRows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof CitiesApiError || err instanceof CountriesApiError
            ? err.message
            : "Failed to load cities";
        setLoadError(message);
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

  const visibleCities = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = cities;
    if (countryFilter !== "all") {
      result = result.filter((c) => c.countryCode === countryFilter);
    }
    if (term) {
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.countryCode.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
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
  }, [cities, search, countryFilter, statusFilter, sortKey, sortDirection]);

  function upsertLocal(city: City) {
    setCities((prev) => {
      const idx = prev.findIndex((c) => c.id === city.id);
      return idx === -1 ? [...prev, city] : prev.map((c, i) => (i === idx ? city : c));
    });
  }

  async function toggleStatus(city: City) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setCityStatus(
        city.cityKey,
        city.status === "active" ? "inactive" : "active",
        actorKey
      );
      upsertLocal(saved);
      toast.success(saved.status === "active" ? "City activated" : "City deactivated");
    } catch (error) {
      toast.error(error instanceof CitiesApiError ? error.message : "Could not update status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="City"
        description="Global city master linked to Country only (not tenant/company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
              disabled={countries.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add city
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading cities…</p>}
      {!loading && countries.length === 0 && (
        <p className="text-sm text-muted-foreground">Add a country first before creating cities.</p>
      )}

      {panelMode !== "closed" && (
        <CityPanel
          mode={panelMode}
          city={target}
          cities={cities}
          countries={countries}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {cities.length > 0 && (
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
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.code}>
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
        {!loading && cities.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            tone="primary"
            heading="No cities yet"
            description="Add your first city under a country."
            size="compact"
          />
        ) : visibleCities.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching cities"
            description="Try a different search term or filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="countryCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Country
                </SortableTableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCities.map((city, index) => (
                <TableRow key={city.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>{city.countryCode}</TableCell>
                  <TableCell className="font-medium">{city.code}</TableCell>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>
                    <Badge variant={city.status === "active" ? "default" : "secondary"}>{city.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setTarget(city);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(city);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(city)}>
                              {city.status === "active" ? "Deactivate" : "Activate"}
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

export default function CityMasterPage() {
  return <AccessGate module="city">{(roleDef) => <CityList roleDef={roleDef} />}</AccessGate>;
}
