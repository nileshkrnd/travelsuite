"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPinned, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import {
  listAirports,
  createAirport,
  updateAirport,
  setAirportActive,
  deleteAirport,
  AirportsApiError,
} from "@/lib/services/airports.service";
import { can } from "@/config/permissions";
import type { Airport, City, Country, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "airportCode" | "airportName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

const NONE = "0";

const schema = z.object({
  airportCode: z
    .string()
    .length(3, "IATA code must be 3 characters")
    .regex(/^[A-Za-z]{3}$/, "Use 3 letters"),
  airportName: z.string().min(1, "Airport name is required").max(300),
  countryId: z.number().int().positive("Select a country"),
  cityId: z.number().int().positive("Select a city"),
  parentAirportId: z.number().int().min(0),
  latitude: z.string().max(20).optional(),
  longitude: z.string().max(20).optional(),
});

type FormValues = z.infer<typeof schema>;

function Panel({
  mode,
  row,
  countries,
  airports,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: Airport;
  countries: Country[];
  airports: Airport[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
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
      airportCode: row?.airportCode ?? "",
      airportName: row?.airportName ?? "",
      countryId: row?.countryId ?? countries[0]?.countryKey ?? 0,
      cityId: row?.cityId ?? 0,
      parentAirportId: row?.parentAirportId ?? 0,
      latitude: row?.latitude ?? "",
      longitude: row?.longitude ?? "",
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

  const parentOptions = airports.filter((a) => a.airportId !== row?.airportId);

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && row) {
        await updateAirport(row.airportId, {
          airportCode: values.airportCode.trim(),
          airportName: values.airportName.trim(),
          countryId: values.countryId,
          cityId: values.cityId,
          parentAirportId: values.parentAirportId,
          latitude: values.latitude?.trim() || null,
          longitude: values.longitude?.trim() || null,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Airport updated");
      } else if (mode === "create") {
        await createAirport({
          airportCode: values.airportCode.trim(),
          airportName: values.airportName.trim(),
          countryId: values.countryId,
          cityId: values.cityId,
          parentAirportId: values.parentAirportId,
          latitude: values.latitude?.trim() || null,
          longitude: values.longitude?.trim() || null,
          createdBy: userKey,
        });
        toast.success("Airport created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof AirportsApiError ? error.message : "Could not save");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add airport" : mode === "edit" ? "Edit airport" : "Airport details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="airportCode">Airport code</Label>
          <Input id="airportCode" disabled={isReadOnly || mode === "edit"} {...register("airportCode")} />
          {errors.airportCode && <p className="text-sm text-destructive">{errors.airportCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="airportName">Airport name</Label>
          <Input id="airportName" disabled={isReadOnly} {...register("airportName")} />
          {errors.airportName && <p className="text-sm text-destructive">{errors.airportName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(Number(v));
                  setValue("cityId", 0);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
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
          <Label>City</Label>
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || cities.length === 0}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
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
        <div className="space-y-2 sm:col-span-2">
          <Label>Parent airport</Label>
          <Controller
            control={control}
            name="parentAirportId"
            render={({ field }) => (
              <Select
                value={String(field.value ?? 0)}
                onValueChange={(v) => field.onChange(Number(v ?? NONE))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (0)</SelectItem>
                  {parentOptions.map((a) => (
                    <SelectItem key={a.airportId} value={String(a.airportId)}>
                      {a.airportCode} — {a.airportName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" disabled={isReadOnly} {...register("latitude")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" disabled={isReadOnly} {...register("longitude")} />
        </div>
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
  const [rows, setRows] = useState<Airport[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Airport | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "airport", "edit");
  const canCreate = can(roleDef, "airport", "create");
  const canDelete = can(roleDef, "airport", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const [airports, countryRows] = await Promise.all([
        listAirports(),
        listCountries({ activeOnly: true }),
      ]);
      setRows(airports);
      setCountries(countryRows);
    } catch (error) {
      setLoadError(error instanceof AirportsApiError ? error.message : "Failed to load");
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
    if (term) {
      result = result.filter(
        (r) =>
          r.airportCode.toLowerCase().includes(term) ||
          r.airportName.toLowerCase().includes(term) ||
          (r.cityName ?? "").toLowerCase().includes(term) ||
          (r.countryName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Airport"
        description="Global airport master — Super Admin Tenant Configuration."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add airport
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
          countries={countries}
          airports={rows}
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
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder="Search code, name, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <EmptyState icon={MapPinned} tone="primary" heading="No airports yet" description="Add your first airport." size="compact" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="airportCode"
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
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="airportName"
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
                <TableHead>Country / City</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.airportId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.airportCode}</TableCell>
                  <TableCell>{row.airportName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.countryName ?? "—"} / {row.cityName ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.parentAirportId > 0 ? (row.parentAirportCode ?? row.parentAirportId) : "—"}
                  </TableCell>
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
                                void setAirportActive(row.airportId, !row.isActive, userKey)
                                  .then(refresh)
                                  .then(() => toast.success(row.isActive ? "Deactivated" : "Activated"))
                                  .catch((e) => toast.error(e instanceof AirportsApiError ? e.message : "Update failed"))
                              }
                            >
                              {row.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() =>
                              void deleteAirport(row.airportId)
                                .then(refresh)
                                .then(() => toast.success("Deleted"))
                                .catch((e) => toast.error(e instanceof AirportsApiError ? e.message : "Delete failed"))
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

export default function AirportMasterPage() {
  return <AccessGate module="airport">{(roleDef) => <List roleDef={roleDef} />}</AccessGate>;
}
