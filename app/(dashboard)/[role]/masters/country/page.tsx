"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  createCountry,
  listCountries,
  setCountryStatus,
  updateCountry,
  CountriesApiError,
} from "@/lib/services/countries.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { useReferenceStore } from "@/lib/store/reference.store";
import { can } from "@/config/permissions";
import type { Country, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "dialCode" | "status" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function useCountrySchema(countries: Country[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .min(2, "Country code is required")
      .max(10, "Country code must be 10 characters or fewer")
      .refine(
        (value) =>
          !countries.some((c) => c.id !== currentId && c.code.toLowerCase() === value.trim().toLowerCase()),
        "This country code is already in use"
      ),
    name: z.string().min(1, "Country name is required"),
    dialCode: z.string().min(1, "Dial code is required"),
  });
}

type FormValues = z.infer<ReturnType<typeof useCountrySchema>>;

function CountryPanel({
  mode,
  country,
  countries,
  actorKey,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  country?: Country;
  countries: Country[];
  actorKey: number;
  onSaved: (country: Country) => void;
  onClose: () => void;
}) {
  const schema = useCountrySchema(countries, country?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      code: country?.code ?? "",
      name: country?.name ?? "",
      dialCode: country?.dialCode ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving countries.");
      return;
    }

    try {
      if (mode === "edit" && country) {
        const saved = await updateCountry(country.countryKey, {
          countryCode: values.code.trim(),
          countryName: values.name.trim(),
          dialCode: values.dialCode.trim(),
          status: country.status,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Country updated");
      } else if (mode === "create") {
        const created = await createCountry({
          countryCode: values.code.trim(),
          countryName: values.name.trim(),
          dialCode: values.dialCode.trim(),
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Country created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof CountriesApiError ? error.message : "Could not save country");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add country" : mode === "edit" ? "Edit country" : "Country details"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country code</Label>
          <Input
            id="countryCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly || mode === "edit"}
            placeholder="e.g. QA"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="countryName">Country name</Label>
          <Input
            id="countryName"
            disabled={isReadOnly}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dialCode">Dial code</Label>
          <Input
            id="dialCode"
            disabled={isReadOnly}
            placeholder="e.g. +974"
            aria-invalid={!!errors.dialCode}
            {...register("dialCode")}
          />
          {errors.dialCode && <p className="text-sm text-destructive">{errors.dialCode.message}</p>}
        </div>

        {mode === "view" && country && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={country.status === "active" ? "default" : "secondary"}>{country.status}</Badge>
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

function CountryList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const setReferenceCountries = useReferenceStore((s) => s.setCountries);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Country | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "country", "edit");
  const canCreate = can(roleDef, "country", "create");
  const actorKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCountries()
      .then((rows) => {
        if (cancelled) return;
        setCountries(rows);
        setReferenceCountries(rows.filter((c) => c.status === "active"));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof CountriesApiError ? err.message : "Failed to load countries");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setReferenceCountries]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleCountries = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = countries;
    if (term) {
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.dialCode.toLowerCase().includes(term)
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
  }, [countries, search, statusFilter, sortKey, sortDirection]);

  function upsertLocal(country: Country) {
    setCountries((prev) => {
      const idx = prev.findIndex((c) => c.id === country.id);
      const next = idx === -1 ? [...prev, country] : prev.map((c, i) => (i === idx ? country : c));
      setReferenceCountries(next.filter((c) => c.status === "active"));
      return next;
    });
  }

  async function toggleStatus(country: Country) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setCountryStatus(
        country.countryKey,
        country.status === "active" ? "inactive" : "active",
        actorKey
      );
      upsertLocal(saved);
      toast.success(saved.status === "active" ? "Country activated" : "Country deactivated");
    } catch (error) {
      toast.error(error instanceof CountriesApiError ? error.message : "Could not update status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Country"
        description="Global country master used when creating tenants (not company-scoped)."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add country
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading countries…</p>}

      {panelMode !== "closed" && (
        <CountryPanel
          mode={panelMode}
          country={target}
          countries={countries}
          actorKey={actorKey}
          onSaved={upsertLocal}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {countries.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or dial…"
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
        {!loading && countries.length === 0 ? (
          <EmptyState
            icon={Globe}
            tone="primary"
            heading="No countries yet"
            description="Add your first country to get started."
            size="compact"
          />
        ) : visibleCountries.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching countries"
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
                <SortableTableHead sortKey="dialCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Dial code
                </SortableTableHead>
                <SortableTableHead sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCountries.map((country, index) => (
                <TableRow key={country.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{country.code}</TableCell>
                  <TableCell>{country.name}</TableCell>
                  <TableCell>{country.dialCode}</TableCell>
                  <TableCell>
                    <Badge variant={country.status === "active" ? "default" : "secondary"}>{country.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setTarget(country);
                            setPanelMode("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setTarget(country);
                                setPanelMode("edit");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(country)}>
                              {country.status === "active" ? "Deactivate" : "Activate"}
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

export default function CountryMasterPage() {
  return <AccessGate module="country">{(roleDef) => <CountryList roleDef={roleDef} />}</AccessGate>;
}
