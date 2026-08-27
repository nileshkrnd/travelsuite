"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Wallet, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listCashCustomerTypes, CashCustomerTypesApiError } from "@/lib/services/cash-customer-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listCashCustomers,
  createCashCustomer,
  updateCashCustomer,
  setCashCustomerActive,
  deleteCashCustomer,
  CashCustomersApiError,
} from "@/lib/services/cash-customers.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, CashCustomer, CashCustomerType, Country, Currency, CommonStatus } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "cashCustomerCode" | "customerName";
type StatusFilter = "all" | "active" | "inactive";

const NONE_OPTION = "__none__";
const STATUS_TYPE_CODE = "CASH_CUSTOMER";

function useCashCustomerSchema(rows: CashCustomer[], currentId?: number) {
  return z
    .object({
      cashCustomerCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
      cashCustomerTypeId: z.number().int().positive({ message: "Type is required" }),
      customerName: z.string().trim().min(1, "Name is required").max(250, "Must be 250 characters or fewer"),
      firstName: z.string().trim().max(100).optional().or(z.literal("")),
      lastName: z.string().trim().max(100).optional().or(z.literal("")),
      mobileCountryCode: z.string().trim().max(10).optional().or(z.literal("")),
      mobileNumber: z.string().trim().max(30).optional().or(z.literal("")),
      email: z.string().trim().max(200).optional().or(z.literal("")),
      countryId: z.number().int().positive().nullable(),
      nationalityId: z.number().int().positive().nullable(),
      currencyId: z.number().int().positive({ message: "Currency is required" }),
      statusId: z.number().int().positive({ message: "Status is required" }),
    })
    .superRefine((values, ctx) => {
      const duplicateCode = rows.some(
        (r) => r.cashCustomerId !== currentId && r.cashCustomerCode.toLowerCase() === values.cashCustomerCode.trim().toLowerCase()
      );
      if (duplicateCode) {
        ctx.addIssue({ code: "custom", path: ["cashCustomerCode"], message: "This customer code already exists" });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof useCashCustomerSchema>>;

function CustomerPanel({
  mode,
  row,
  rows,
  types,
  countries,
  currencies,
  statuses,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: CashCustomer;
  rows: CashCustomer[];
  types: CashCustomerType[];
  countries: Country[];
  currencies: Currency[];
  statuses: CommonStatus[];
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useCashCustomerSchema(rows, row?.cashCustomerId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      cashCustomerCode: row?.cashCustomerCode ?? "",
      cashCustomerTypeId: row?.cashCustomerTypeId ?? 0,
      customerName: row?.customerName ?? "",
      firstName: row?.firstName ?? "",
      lastName: row?.lastName ?? "",
      mobileCountryCode: row?.mobileCountryCode ?? "",
      mobileNumber: row?.mobileNumber ?? "",
      email: row?.email ?? "",
      countryId: row?.countryId ?? null,
      nationalityId: row?.nationalityId ?? null,
      currencyId: row?.currencyId ?? 0,
      statusId: row?.statusId ?? 0,
    },
  });

  function blankValues(): FormValues {
    return {
      cashCustomerCode: "",
      cashCustomerTypeId: 0,
      customerName: "",
      firstName: "",
      lastName: "",
      mobileCountryCode: "",
      mobileNumber: "",
      email: "",
      countryId: null,
      nationalityId: null,
      currencyId: 0,
      statusId: 0,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      cashCustomerCode: values.cashCustomerCode.trim(),
      cashCustomerTypeId: values.cashCustomerTypeId,
      customerName: values.customerName.trim(),
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
      mobileCountryCode: values.mobileCountryCode || undefined,
      mobileNumber: values.mobileNumber || undefined,
      email: values.email || undefined,
      countryId: values.countryId,
      nationalityId: values.nationalityId,
      currencyId: values.currencyId,
      statusId: values.statusId,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateCashCustomer(row.cashCustomerId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Cash customer updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createCashCustomer({ ...payload, createdBy: userKey });
        toast.success("Cash customer created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof CashCustomersApiError ? error.message : "Could not save cash customer");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add cash customer" : mode === "edit" ? "Edit cash customer" : "Cash customer details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="cashCustomerCode" required>
            Code
          </Label>
          <Input
            id="cashCustomerCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. WALKIN-0001"
            aria-invalid={!!errors.cashCustomerCode}
            {...register("cashCustomerCode")}
          />
          {errors.cashCustomerCode && <p className="text-sm text-destructive">{errors.cashCustomerCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Type</Label>
          <Controller
            control={control}
            name="cashCustomerTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.cashCustomerTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return types.find((t) => String(t.cashCustomerTypeId) === value)?.customerTypeName ?? "Select type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.cashCustomerTypeId} value={String(t.cashCustomerTypeId)}>
                      {t.customerTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.cashCustomerTypeId && <p className="text-sm text-destructive">{errors.cashCustomerTypeId.message}</p>}
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-2">
          <Label htmlFor="customerName" required>
            Customer name
          </Label>
          <Input
            id="customerName"
            disabled={isReadOnly}
            placeholder="e.g. John Smith"
            aria-invalid={!!errors.customerName}
            {...register("customerName")}
          />
          {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" disabled={isReadOnly} {...register("firstName")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" disabled={isReadOnly} {...register("lastName")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mobileCountryCode">Mobile country code</Label>
          <Input id="mobileCountryCode" disabled={isReadOnly} placeholder="e.g. +974" {...register("mobileCountryCode")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mobileNumber">Mobile number</Label>
          <Input id="mobileNumber" disabled={isReadOnly} {...register("mobileNumber")} />
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" disabled={isReadOnly} {...register("email")} />
        </div>

        <div className="space-y-1">
          <Label>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Nationality</Label>
          <Controller
            control={control}
            name="nationalityId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label required>Currency</Label>
          <Controller
            control={control}
            name="currencyId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.currencyId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select currency";
                      return currencies.find((c) => String(c.currencyKey) === value)?.code ?? "Select currency";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.currencyKey} value={String(c.currencyKey)}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.currencyId && <p className="text-sm text-destructive">{errors.currencyId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Status</Label>
          <Controller
            control={control}
            name="statusId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.statusId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select status";
                      return statuses.find((s) => String(s.commonStatusId) === value)?.statusName ?? "Select status";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.commonStatusId} value={String(s.commonStatusId)}>
                      {s.statusName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.statusId && <p className="text-sm text-destructive">{errors.statusId.message}</p>}
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Active</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create &amp; add more
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function CustomerList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const [types, setTypes] = useState<CashCustomerType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [rows, setRows] = useState<CashCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<CashCustomer | undefined>();
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("customerName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const scopeCompanyId = resolveSessionCompanyKey(user) ?? 0;

  const canEdit = can(roleDef, "cashCustomer", "edit");
  const canCreate = can(roleDef, "cashCustomer", "create");
  const canDelete = can(roleDef, "cashCustomer", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function loadAll() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage cash customers." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, countryRows, currencyRows, statusTypeRows, customerRows] = await Promise.all([
        listCashCustomerTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listCountries({ activeOnly: true }),
        listCurrencies({ activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listCashCustomers({ tenantId: scopeTenantId }),
      ]);
      setTypes(typeRows);
      setCountries(countryRows);
      setCurrencies(currencyRows);
      setRows(customerRows);

      const statusType = statusTypeRows.find((t) => t.statusTypeCode === STATUS_TYPE_CODE);
      if (statusType) {
        setStatuses(await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: statusType.commonStatusTypeId, activeOnly: true }));
      } else {
        setStatuses([]);
      }
    } catch (error) {
      setLoadError(
        error instanceof CashCustomerTypesApiError || error instanceof CashCustomersApiError
          ? error.message
          : "Failed to load cash customers"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (typeFilter) result = result.filter((r) => r.cashCustomerTypeId === typeFilter);
    if (term) {
      result = result.filter(
        (r) => r.customerName.toLowerCase().includes(term) || r.cashCustomerCode.toLowerCase().includes(term)
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
  }, [rows, search, typeFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: CashCustomer) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setCashCustomerActive(row.cashCustomerId, !row.isActive, userKey);
      await loadAll();
      toast.success(row.isActive ? "Customer deactivated" : "Customer activated");
    } catch (error) {
      toast.error(error instanceof CashCustomersApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: CashCustomer) {
    try {
      await deleteCashCustomer(row.cashCustomerId);
      await loadAll();
      toast.success("Customer deleted");
    } catch (error) {
      toast.error(error instanceof CashCustomersApiError ? error.message : "Could not delete customer");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Cash Customer"
        description="Retail and walk-in customers — individuals rather than B2B accounts."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add cash customer
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={typeFilter ? String(typeFilter) : "all"} onValueChange={(v) => setTypeFilter(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.cashCustomerTypeId} value={String(t.cashCustomerTypeId)}>
                  {t.customerTypeName}
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

      {panelMode !== "closed" && (
        <CustomerPanel
          mode={panelMode}
          row={target}
          rows={rows}
          types={types}
          countries={countries}
          currencies={currencies}
          statuses={statuses}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={target?.companyId ?? scopeCompanyId}
          onSaved={loadAll}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading cash customers…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} tone="primary" heading="No cash customers yet" description="Add your first retail or walk-in customer." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching customers" description="Try a different search or filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="cashCustomerCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[14%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="customerName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[22%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Mobile</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Currency</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.cashCustomerId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.cashCustomerCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.customerName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.customerTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.mobileNumber ? `${row.mobileCountryCode ?? ""} ${row.mobileNumber}`.trim() : "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.currencyCode ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.statusName ?? (row.isActive ? "active" : "inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="View"
                              onClick={() => {
                                setTarget(row);
                                setPanelMode("view");
                              }}
                            />
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Edit"
                                  onClick={() => {
                                    setTarget(row);
                                    setPanelMode("edit");
                                  }}
                                />
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={row.isActive ? "Deactivate" : "Activate"}
                                  onClick={() => void toggleActive(row)}
                                />
                              }
                            >
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
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

export default function CashCustomerMasterPage() {
  return <AccessGate module="cashCustomer">{(roleDef) => <CustomerList roleDef={roleDef} />}</AccessGate>;
}
