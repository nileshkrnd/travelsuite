"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPin, MoreHorizontal, X, Search } from "lucide-react";
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
  createState,
  deleteState,
  listStates,
  setStateActive,
  updateState,
  StatesApiError,
} from "@/lib/services/states.service";
import { listStateAdministrativeTypes } from "@/lib/services/state-administrative-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { useReferenceStore } from "@/lib/store/reference.store";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { City, Country, RoleDef, State, StateAdministrativeType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "countryCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

function useStateSchema(states: State[], currentId?: string) {
  return z.object({
    countryId: z.number().int().positive("Country is required"),
    code: z
      .string()
      .trim()
      .min(1, "State code is required")
      .max(20, "State code must be 20 characters or fewer")
      .refine(
        (value) =>
          !states.some(
            (s) => s.id !== currentId && s.code.toLowerCase() === value.trim().toLowerCase() && s.countryKey
          ),
        "This state code is already in use for the selected country"
      ),
    isoCode: z.string().trim().max(20).optional().or(z.literal("")),
    name: z.string().trim().min(1, "State name is required").max(150),
    nativeName: z.string().trim().max(150).optional().or(z.literal("")),
    administrativeTypeId: z.number().int().positive().optional(),
    capitalCityId: z.number().int().positive().optional(),
    latitude: z.string().trim().optional().or(z.literal("")),
    longitude: z.string().trim().optional().or(z.literal("")),
    displayOrder: z.string().trim().optional().or(z.literal("")),
  });
}

type FormValues = z.infer<ReturnType<typeof useStateSchema>>;

function StatePanel({
  mode,
  state,
  states,
  countries,
  administrativeTypes,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  state?: State;
  states: State[];
  countries: Country[];
  administrativeTypes: StateAdministrativeType[];
  actorKey: number;
  onSaved: (state: State) => void;
  onClose: () => void;
}) {
  const schema = useStateSchema(states, state?.id);
  const isReadOnly = mode === "view";
  const [cities, setCities] = useState<City[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      countryId: state?.countryKey ?? 0,
      code: state?.code ?? "",
      isoCode: state?.isoCode ?? "",
      name: state?.name ?? "",
      nativeName: state?.nativeName ?? "",
      administrativeTypeId: state?.administrativeTypeKey ?? undefined,
      capitalCityId: state?.capitalCityKey ?? undefined,
      latitude: state?.latitude != null ? String(state.latitude) : "",
      longitude: state?.longitude != null ? String(state.longitude) : "",
      displayOrder: state?.displayOrder != null ? String(state.displayOrder) : "",
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
      toast.error("Missing user key — sign in again before saving states.");
      return;
    }

    const payload = {
      countryId: values.countryId,
      stateCode: values.code.trim(),
      isoCode: values.isoCode?.trim() || undefined,
      stateName: values.name.trim(),
      nativeName: values.nativeName?.trim() || undefined,
      stateAdministrativeTypeId: values.administrativeTypeId ?? null,
      capitalCityId: values.capitalCityId ?? null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
      displayOrder: values.displayOrder?.trim() ? Number(values.displayOrder) : 0,
    };

    try {
      if (mode === "edit" && state) {
        const saved = await updateState(state.stateKey, {
          ...payload,
          isActive: state.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("State updated");
      } else if (mode === "create") {
        const created = await createState({ ...payload, createdBy: actorKey });
        onSaved(created);
        toast.success("State created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof StatesApiError ? error.message : "Could not save state");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add state" : mode === "edit" ? "Edit state" : "State details"}
          </h2>
        </div>
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
                onValueChange={(v) => field.onChange(Number(v))}
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
          <Label htmlFor="stateCode" required>
            State code
          </Label>
          <Input
            id="stateCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            placeholder="e.g. CA, MH, DXB"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stateName" required>
            State name
          </Label>
          <Input id="stateName" disabled={isReadOnly} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="isoCode">ISO 3166-2 code</Label>
          <Input id="isoCode" disabled={isReadOnly} placeholder="e.g. US-CA" {...register("isoCode")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nativeName">Native name</Label>
          <Input id="nativeName" disabled={isReadOnly} {...register("nativeName")} />
        </div>

        <div className="space-y-2">
          <Label>Administrative type</Label>
          <Controller
            control={control}
            name="administrativeTypeId"
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
                      return administrativeTypes.find((t) => String(t.typeKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {administrativeTypes.map((t) => (
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
          <Label>Capital city</Label>
          <Controller
            control={control}
            name="capitalCityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                disabled={isReadOnly || !countryId || cities.length === 0}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return !countryId ? "Select a country first" : "Select capital city";
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" disabled={isReadOnly} placeholder="e.g. 34.052235" {...register("latitude")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" disabled={isReadOnly} placeholder="e.g. -118.243683" {...register("longitude")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        {mode === "view" && state && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={state.isActive ? "default" : "secondary"}>
                {state.isActive ? "active" : "inactive"}
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

function StateList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const referenceCountries = useReferenceStore((s) => s.countries);
  const setReferenceCountries = useReferenceStore((s) => s.setCountries);
  const [states, setStates] = useState<State[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [administrativeTypes, setAdministrativeTypes] = useState<StateAdministrativeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<State | undefined>();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "state", "edit");
  const canCreate = can(roleDef, "state", "create");
  const canDelete = can(roleDef, "state", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listStates(), listCountries(), listStateAdministrativeTypes()])
      .then(([stateRows, countryRows, typeRows]) => {
        if (cancelled) return;
        setStates(stateRows);
        setCountries(countryRows);
        setAdministrativeTypes(typeRows);
        if (referenceCountries.length === 0) setReferenceCountries(countryRows.filter((c) => c.status === "active"));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof StatesApiError ? err.message : "Failed to load states");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleStates = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = states;
    if (countryFilter !== "all") {
      const key = Number(countryFilter);
      result = result.filter((s) => s.countryKey === key);
    }
    if (term) {
      result = result.filter(
        (s) =>
          s.code.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          (s.isoCode ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => (statusFilter === "active" ? s.isActive : !s.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        if (sortKey === "displayOrder") {
          return sortDirection === "asc" ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder;
        }
        const av = sortKey === "countryCode" ? a.countryCode : a[sortKey];
        const bv = sortKey === "countryCode" ? b.countryCode : b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [states, search, countryFilter, statusFilter, sortKey, sortDirection]);

  function upsertLocal(state: State) {
    setStates((prev) => {
      const idx = prev.findIndex((s) => s.id === state.id);
      return idx === -1 ? [...prev, state] : prev.map((s, i) => (i === idx ? state : s));
    });
  }

  async function toggleActive(state: State) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setStateActive(state.stateKey, !state.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "State activated" : "State deactivated");
    } catch (error) {
      toast.error(error instanceof StatesApiError ? error.message : "Could not update status");
    }
  }

  async function removeState(state: State) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await deleteState(state.stateKey, actorKey);
      setStates((prev) => prev.filter((s) => s.id !== state.id));
      toast.success("State deleted");
    } catch (error) {
      toast.error(error instanceof StatesApiError ? error.message : "Could not delete state");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="State"
        description="Global state/province master used across countries (not company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add state
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading states…</p>}

      {panelMode !== "closed" && (
        <StatePanel
          mode={panelMode}
          state={target}
          states={states}
          countries={countries}
          administrativeTypes={administrativeTypes}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {states.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or ISO…"
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
        {!loading && states.length === 0 ? (
          <EmptyState
            icon={MapPin}
            tone="primary"
            heading="No states yet"
            description="Add your first state or province to get started."
            size="compact"
          />
        ) : visibleStates.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching states"
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
                  sortKey="countryCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Country
                </SortableTableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStates.map((state, index) => (
                <TableRow key={state.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{state.code}</TableCell>
                  <TableCell>{state.name}</TableCell>
                  <TableCell className="text-muted-foreground">{state.countryCode}</TableCell>
                  <TableCell className="text-muted-foreground">{state.administrativeTypeName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{state.capitalCityName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={state.isActive ? "default" : "secondary"}>
                      {state.isActive ? "active" : "inactive"}
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
                            setTarget(state);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(state);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(state)}>
                              {state.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeState(state)}>Delete</DropdownMenuItem>
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

export default function StateMasterPage() {
  return <AccessGate module="state">{(roleDef) => <StateList roleDef={roleDef} />}</AccessGate>;
}
