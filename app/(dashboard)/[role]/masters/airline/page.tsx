"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Plane, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import { listAirlineTypes } from "@/lib/services/airline-types.service";
import {
  listAirlines,
  createAirline,
  updateAirline,
  setAirlineActive,
  deleteAirline,
  AirlinesApiError,
} from "@/lib/services/airlines.service";
import { can } from "@/config/permissions";
import type { Airline, AirlineType, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "airlineCode" | "airlineName" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

const schema = z.object({
  airlineTypeId: z.number().int().positive("Select an airline type"),
  airlineCode: z
    .string()
    .min(2, "Code is required")
    .max(3, "IATA code is max 3 characters")
    .regex(/^[A-Za-z0-9]{2,3}$/, "Use 2–3 alphanumeric characters"),
  airlineName: z.string().min(1, "Airline name is required").max(200),
  airlineNumericCode: z.string().optional(),
  pnrMaxDigit: z.number().int().min(1).max(50),
  tktMaxDigit: z.number().int().min(1).max(50),
  isTktNumberOnly: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function Panel({
  mode,
  row,
  types,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: Airline;
  types: AirlineType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      airlineTypeId: row?.airlineTypeId ?? types[0]?.airlineTypeId ?? 0,
      airlineCode: row?.airlineCode ?? "",
      airlineName: row?.airlineName ?? "",
      airlineNumericCode: row?.airlineNumericCode != null ? String(row.airlineNumericCode) : "",
      pnrMaxDigit: row?.pnrMaxDigit ?? 6,
      tktMaxDigit: row?.tktMaxDigit ?? 13,
      isTktNumberOnly: row?.isTktNumberOnly ?? false,
    },
  });

  async function onSubmit(values: FormValues) {
    const numeric =
      values.airlineNumericCode?.trim() === "" || values.airlineNumericCode == null
        ? null
        : Number(values.airlineNumericCode);
    if (numeric != null && Number.isNaN(numeric)) {
      toast.error("Numeric code must be a number");
      return;
    }
    try {
      if (mode === "edit" && row) {
        await updateAirline(row.airlineId, {
          airlineTypeId: values.airlineTypeId,
          airlineCode: values.airlineCode.trim(),
          airlineName: values.airlineName.trim(),
          airlineNumericCode: numeric,
          pnrMaxDigit: values.pnrMaxDigit,
          tktMaxDigit: values.tktMaxDigit,
          isTktNumberOnly: values.isTktNumberOnly,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Airline updated");
      } else if (mode === "create") {
        await createAirline({
          airlineTypeId: values.airlineTypeId,
          airlineCode: values.airlineCode.trim(),
          airlineName: values.airlineName.trim(),
          airlineNumericCode: numeric,
          pnrMaxDigit: values.pnrMaxDigit,
          tktMaxDigit: values.tktMaxDigit,
          isTktNumberOnly: values.isTktNumberOnly,
          createdBy: userKey,
        });
        toast.success("Airline created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof AirlinesApiError ? error.message : "Could not save");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add airline" : mode === "edit" ? "Edit airline" : "Airline details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Airline type</Label>
          <Controller
            control={control}
            name="airlineTypeId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || types.length === 0}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.airlineTypeId} value={String(t.airlineTypeId)}>
                      {t.airlineTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.airlineTypeId && <p className="text-sm text-destructive">{errors.airlineTypeId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="airlineCode">Airline code</Label>
          <Input id="airlineCode" disabled={isReadOnly || mode === "edit"} {...register("airlineCode")} />
          {errors.airlineCode && <p className="text-sm text-destructive">{errors.airlineCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="airlineNumericCode">Numeric code</Label>
          <Input id="airlineNumericCode" disabled={isReadOnly} {...register("airlineNumericCode")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="airlineName">Airline name</Label>
          <Input id="airlineName" disabled={isReadOnly} {...register("airlineName")} />
          {errors.airlineName && <p className="text-sm text-destructive">{errors.airlineName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pnrMaxDigit">PNR max digit</Label>
          <Input
            id="pnrMaxDigit"
            type="number"
            disabled={isReadOnly}
            {...register("pnrMaxDigit", { valueAsNumber: true })}
          />
          {errors.pnrMaxDigit && <p className="text-sm text-destructive">{errors.pnrMaxDigit.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tktMaxDigit">Ticket max digit</Label>
          <Input
            id="tktMaxDigit"
            type="number"
            disabled={isReadOnly}
            {...register("tktMaxDigit", { valueAsNumber: true })}
          />
          {errors.tktMaxDigit && <p className="text-sm text-destructive">{errors.tktMaxDigit.message}</p>}
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Controller
            control={control}
            name="isTktNumberOnly"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.value}
                  disabled={isReadOnly}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                Ticket number only (IsTKTNumberOnly)
              </label>
            )}
          />
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || types.length === 0}>
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
  const [rows, setRows] = useState<Airline[]>([]);
  const [types, setTypes] = useState<AirlineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Airline | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "airline", "edit");
  const canCreate = can(roleDef, "airline", "create");
  const canDelete = can(roleDef, "airline", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const [airlines, airlineTypes] = await Promise.all([
        listAirlines(),
        listAirlineTypes({ activeOnly: true }),
      ]);
      setRows(airlines);
      setTypes(airlineTypes);
    } catch (error) {
      setLoadError(error instanceof AirlinesApiError ? error.message : "Failed to load");
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
          r.airlineCode.toLowerCase().includes(term) ||
          r.airlineName.toLowerCase().includes(term) ||
          (r.airlineTypeName ?? "").toLowerCase().includes(term)
      );
    }
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
        title="Airline"
        description="Global airline master — Super Admin Tenant Configuration."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                if (types.length === 0) {
                  toast.error("Create an Airline Type first.");
                  return;
                }
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add airline
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
          types={types}
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
            <Input className="ps-9" placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <EmptyState icon={Plane} tone="primary" heading="No airlines yet" description="Add an airline type first, then create airlines." size="compact" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="airlineCode"
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
                  sortKey="airlineName"
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
                <TableHead>Type</TableHead>
                <TableHead>PNR / TKT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.airlineId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.airlineCode}</TableCell>
                  <TableCell>{row.airlineName}</TableCell>
                  <TableCell>{row.airlineTypeName ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {row.pnrMaxDigit} / {row.tktMaxDigit}
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
                                void setAirlineActive(row.airlineId, !row.isActive, userKey)
                                  .then(refresh)
                                  .then(() => toast.success(row.isActive ? "Deactivated" : "Activated"))
                                  .catch((e) => toast.error(e instanceof AirlinesApiError ? e.message : "Update failed"))
                              }
                            >
                              {row.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() =>
                              void deleteAirline(row.airlineId)
                                .then(refresh)
                                .then(() => toast.success("Deleted"))
                                .catch((e) => toast.error(e instanceof AirlinesApiError ? e.message : "Delete failed"))
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

export default function AirlineMasterPage() {
  return <AccessGate module="airline">{(roleDef) => <List roleDef={roleDef} />}</AccessGate>;
}
