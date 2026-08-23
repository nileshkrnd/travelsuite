"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Landmark, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { listB2BCustomerTypes, B2BCustomerTypesApiError } from "@/lib/services/b2b-customer-types.service";
import { listB2BCustomerCategories, B2BCustomerCategoriesApiError } from "@/lib/services/b2b-customer-categories.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import { listPaymentTerms } from "@/lib/services/payment-terms.service";
import { listEmployees } from "@/lib/services/employees.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listB2BCustomers,
  createB2BCustomer,
  updateB2BCustomer,
  setB2BCustomerActive,
  deleteB2BCustomer,
  B2BCustomersApiError,
} from "@/lib/services/b2b-customers.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  RoleDef,
  B2BCustomer,
  B2BCustomerType,
  B2BCustomerCategory,
  Country,
  Currency,
  PaymentTerm,
  Employee,
  CommonStatus,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "b2bCustomerCode" | "b2bCustomerName";
type StatusFilter = "all" | "active" | "inactive";

const NONE_OPTION = "__none__";
const STATUS_TYPE_CODE = "B2B_CUSTOMER";

function useB2BCustomerSchema(rows: B2BCustomer[], currentId?: number) {
  return z
    .object({
      b2bCustomerCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
      b2bCustomerName: z.string().trim().min(1, "Name is required").max(250, "Must be 250 characters or fewer"),
      b2bCustomerTypeId: z.number().int().positive({ message: "Type is required" }),
      b2bCustomerCategoryId: z.number().int().positive().nullable(),
      parentB2bCustomerId: z.number().int().positive().nullable(),
      registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
      taxRegistrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
      countryId: z.number().int().positive({ message: "Country is required" }),
      currencyId: z.number().int().positive({ message: "Currency is required" }),
      paymentTermId: z.number().int().positive().nullable(),
      creditLimit: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable()),
      creditDays: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable()),
      accountManagerId: z.number().int().positive().nullable(),
      statusId: z.number().int().positive({ message: "Status is required" }),
    })
    .superRefine((values, ctx) => {
      const duplicateCode = rows.some(
        (r) =>
          r.b2bCustomerId !== currentId && r.b2bCustomerCode.toLowerCase() === values.b2bCustomerCode.trim().toLowerCase()
      );
      if (duplicateCode) {
        ctx.addIssue({ code: "custom", path: ["b2bCustomerCode"], message: "This customer code already exists" });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof useB2BCustomerSchema>>;

/** Excludes a customer and its full descendant chain — those can't be picked as its own parent. */
function parentOptionsFor(rows: B2BCustomer[], excludeId: number | undefined) {
  if (excludeId == null) return rows;
  const excluded = new Set<number>([excludeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rows) {
      if (r.parentB2bCustomerId != null && excluded.has(r.parentB2bCustomerId) && !excluded.has(r.b2bCustomerId)) {
        excluded.add(r.b2bCustomerId);
        changed = true;
      }
    }
  }
  return rows.filter((r) => !excluded.has(r.b2bCustomerId));
}

function CustomerPanel({
  mode,
  row,
  rows,
  types,
  categories,
  countries,
  currencies,
  paymentTerms,
  employees,
  statuses,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: B2BCustomer;
  rows: B2BCustomer[];
  types: B2BCustomerType[];
  categories: B2BCustomerCategory[];
  countries: Country[];
  currencies: Currency[];
  paymentTerms: PaymentTerm[];
  employees: Employee[];
  statuses: CommonStatus[];
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useB2BCustomerSchema(rows, row?.b2bCustomerId);
  const isReadOnly = mode === "view";
  const parentOptions = useMemo(() => parentOptionsFor(rows, row?.b2bCustomerId), [rows, row?.b2bCustomerId]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      b2bCustomerCode: row?.b2bCustomerCode ?? "",
      b2bCustomerName: row?.b2bCustomerName ?? "",
      b2bCustomerTypeId: row?.b2bCustomerTypeId ?? 0,
      b2bCustomerCategoryId: row?.b2bCustomerCategoryId ?? null,
      parentB2bCustomerId: row?.parentB2bCustomerId ?? null,
      registrationNumber: row?.registrationNumber ?? "",
      taxRegistrationNumber: row?.taxRegistrationNumber ?? "",
      countryId: row?.countryId ?? 0,
      currencyId: row?.currencyId ?? 0,
      paymentTermId: row?.paymentTermId ?? null,
      creditLimit: row?.creditLimit ?? null,
      creditDays: row?.creditDays ?? null,
      accountManagerId: row?.accountManagerId ?? null,
      statusId: row?.statusId ?? 0,
    },
  });

  const typeIdWatch = watch("b2bCustomerTypeId");
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.b2bCustomerTypeId === typeIdWatch),
    [categories, typeIdWatch]
  );

  function blankValues(): FormValues {
    return {
      b2bCustomerCode: "",
      b2bCustomerName: "",
      b2bCustomerTypeId: 0,
      b2bCustomerCategoryId: null,
      parentB2bCustomerId: null,
      registrationNumber: "",
      taxRegistrationNumber: "",
      countryId: 0,
      currencyId: 0,
      paymentTermId: null,
      creditLimit: null,
      creditDays: null,
      accountManagerId: null,
      statusId: 0,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      b2bCustomerCode: values.b2bCustomerCode.trim(),
      b2bCustomerName: values.b2bCustomerName.trim(),
      b2bCustomerTypeId: values.b2bCustomerTypeId,
      b2bCustomerCategoryId: values.b2bCustomerCategoryId,
      parentB2bCustomerId: values.parentB2bCustomerId,
      registrationNumber: values.registrationNumber || undefined,
      taxRegistrationNumber: values.taxRegistrationNumber || undefined,
      countryId: values.countryId,
      currencyId: values.currencyId,
      paymentTermId: values.paymentTermId,
      creditLimit: values.creditLimit,
      creditDays: values.creditDays,
      accountManagerId: values.accountManagerId,
      statusId: values.statusId,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateB2BCustomer(row.b2bCustomerId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("B2B customer updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createB2BCustomer({ ...payload, createdBy: userKey });
        toast.success("B2B customer created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not save B2B customer");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add B2B customer" : mode === "edit" ? "Edit B2B customer" : "B2B customer details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="b2bCustomerCode" required>
            Code
          </Label>
          <Input
            id="b2bCustomerCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. CORP-0001"
            aria-invalid={!!errors.b2bCustomerCode}
            {...register("b2bCustomerCode")}
          />
          {errors.b2bCustomerCode && <p className="text-sm text-destructive">{errors.b2bCustomerCode.message}</p>}
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-3">
          <Label htmlFor="b2bCustomerName" required>
            Name
          </Label>
          <Input
            id="b2bCustomerName"
            disabled={isReadOnly}
            placeholder="e.g. Acme Corporation"
            aria-invalid={!!errors.b2bCustomerName}
            {...register("b2bCustomerName")}
          />
          {errors.b2bCustomerName && <p className="text-sm text-destructive">{errors.b2bCustomerName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Type</Label>
          <Controller
            control={control}
            name="b2bCustomerTypeId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  field.onChange(v ? Number(v) : 0);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.b2bCustomerTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return types.find((t) => String(t.b2bCustomerTypeId) === value)?.customerTypeName ?? "Select type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.b2bCustomerTypeId} value={String(t.b2bCustomerTypeId)}>
                      {t.customerTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.b2bCustomerTypeId && <p className="text-sm text-destructive">{errors.b2bCustomerTypeId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Category</Label>
          <Controller
            control={control}
            name="b2bCustomerCategoryId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly || !typeIdWatch}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return categoryOptions.find((c) => String(c.b2bCustomerCategoryId) === value)?.categoryName ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.b2bCustomerCategoryId} value={String(c.b2bCustomerCategoryId)}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Parent customer</Label>
          <Controller
            control={control}
            name="parentB2bCustomerId"
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
                      return (
                        parentOptions.find((p) => String(p.b2bCustomerId) === value)?.b2bCustomerName ?? "None"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.b2bCustomerId} value={String(p.b2bCustomerId)}>
                      {p.b2bCustomerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="registrationNumber">Registration number</Label>
          <Input id="registrationNumber" disabled={isReadOnly} {...register("registrationNumber")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="taxRegistrationNumber">Tax registration number</Label>
          <Input id="taxRegistrationNumber" disabled={isReadOnly} {...register("taxRegistrationNumber")} />
        </div>

        <div className="space-y-1">
          <Label required>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.countryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select country";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? "Select country";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Currency</Label>
          <Controller
            control={control}
            name="currencyId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                disabled={isReadOnly}
              >
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
          <Label>Payment term</Label>
          <Controller
            control={control}
            name="paymentTermId"
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
                      return paymentTerms.find((p) => String(p.paymentTermId) === value)?.paymentTermName ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {paymentTerms.map((p) => (
                    <SelectItem key={p.paymentTermId} value={String(p.paymentTermId)}>
                      {p.paymentTermName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="creditLimit">Credit limit</Label>
          <Input id="creditLimit" type="number" min={0} step="0.01" disabled={isReadOnly} {...register("creditLimit")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="creditDays">Credit days</Label>
          <Input id="creditDays" type="number" min={0} disabled={isReadOnly} {...register("creditDays")} />
        </div>

        <div className="space-y-1">
          <Label>Account manager</Label>
          <Controller
            control={control}
            name="accountManagerId"
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
                      const emp = employees.find((e) => String(e.employeeId) === value);
                      return emp ? `${emp.firstName} ${emp.lastName}` : "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label required>Status</Label>
          <Controller
            control={control}
            name="statusId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                disabled={isReadOnly}
              >
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

  const [types, setTypes] = useState<B2BCustomerType[]>([]);
  const [categories, setCategories] = useState<B2BCustomerCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [rows, setRows] = useState<B2BCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<B2BCustomer | undefined>();
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("b2bCustomerName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const scopeCompanyId = resolveSessionCompanyKey(user) ?? 0;

  const canEdit = can(roleDef, "b2bCustomer", "edit");
  const canCreate = can(roleDef, "b2bCustomer", "create");
  const canDelete = can(roleDef, "b2bCustomer", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function loadAll() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage B2B customers." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, categoryRows, countryRows, currencyRows, paymentTermRows, employeeRows, statusTypeRows, customerRows] =
        await Promise.all([
          listB2BCustomerTypes({ tenantId: scopeTenantId, activeOnly: true }),
          listB2BCustomerCategories({ tenantId: scopeTenantId, activeOnly: true }),
          listCountries({ activeOnly: true }),
          listCurrencies({ activeOnly: true }),
          listPaymentTerms({ tenantId: scopeTenantId, activeOnly: true }),
          listEmployees({ tenantId: scopeTenantId, activeOnly: true }),
          listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
          listB2BCustomers({ tenantId: scopeTenantId }),
        ]);
      setTypes(typeRows);
      setCategories(categoryRows);
      setCountries(countryRows);
      setCurrencies(currencyRows);
      setPaymentTerms(paymentTermRows);
      setEmployees(employeeRows);
      setRows(customerRows);

      const statusType = statusTypeRows.find((t) => t.statusTypeCode === STATUS_TYPE_CODE);
      if (statusType) {
        setStatuses(await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: statusType.commonStatusTypeId, activeOnly: true }));
      } else {
        setStatuses([]);
      }
    } catch (error) {
      setLoadError(
        error instanceof B2BCustomerTypesApiError ||
          error instanceof B2BCustomerCategoriesApiError ||
          error instanceof B2BCustomersApiError
          ? error.message
          : "Failed to load B2B customers"
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
    if (typeFilter) result = result.filter((r) => r.b2bCustomerTypeId === typeFilter);
    if (term) {
      result = result.filter(
        (r) => r.b2bCustomerName.toLowerCase().includes(term) || r.b2bCustomerCode.toLowerCase().includes(term)
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

  async function toggleActive(row: B2BCustomer) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setB2BCustomerActive(row.b2bCustomerId, !row.isActive, userKey);
      await loadAll();
      toast.success(row.isActive ? "Customer deactivated" : "Customer activated");
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: B2BCustomer) {
    try {
      await deleteB2BCustomer(row.b2bCustomerId);
      await loadAll();
      toast.success("Customer deleted");
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not delete customer");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="B2B Customer"
        description="Corporate and Sub-Agent accounts — credit terms, account manager, and status in one place."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add B2B customer
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={typeFilter ? String(typeFilter) : "all"} onValueChange={(v) => setTypeFilter(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.b2bCustomerTypeId} value={String(t.b2bCustomerTypeId)}>
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
          categories={categories}
          countries={countries}
          currencies={currencies}
          paymentTerms={paymentTerms}
          employees={employees}
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
          <p className="p-6 text-sm text-muted-foreground">Loading B2B customers…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Landmark}
            tone="primary"
            heading="No B2B customers yet"
            description="Add your first Corporate or Sub-Agent account."
            size="compact"
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching customers" description="Try a different search or filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="b2bCustomerCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[12%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="b2bCustomerName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[20%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Category</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Country</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Currency</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.b2bCustomerId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.b2bCustomerCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.b2bCustomerName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.customerTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.categoryName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.countryName ?? "—"}</TableCell>
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

export default function B2BCustomerMasterPage() {
  return <AccessGate module="b2bCustomer">{(roleDef) => <CustomerList roleDef={roleDef} />}</AccessGate>;
}
