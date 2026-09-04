"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Eye, Loader2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  B2BCustomersApiError,
} from "@/lib/services/b2b-customers.service";
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

const NONE_OPTION = "__none__";
const STATUS_TYPE_CODE = "B2B_CUSTOMER";

export function b2bCustomerPaths(role: string, id?: number) {
  const list = `/${role}/masters/b2bcustomer`;
  return {
    list,
    create: `${list}/new`,
    view: id != null ? `${list}/${id}` : list,
    edit: id != null ? `${list}/${id}/edit` : list,
    details: id != null ? `${list}/${id}/details` : list,
  };
}

export function B2BCustomerHeaderActions({
  role,
  id,
  current,
  canEdit,
}: {
  role: string;
  id: number;
  current: "view" | "edit" | "details";
  canEdit: boolean;
}) {
  const paths = b2bCustomerPaths(role, id);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" nativeButton={false} render={<Link href={paths.list} />}>
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </Button>
      {current !== "view" && (
        <Button variant="outline" nativeButton={false} render={<Link href={paths.view} />}>
          <Eye className="h-4 w-4" />
          View
        </Button>
      )}
      {current !== "details" && (
        <Button variant="outline" nativeButton={false} render={<Link href={paths.details} />}>
          <ClipboardList className="h-4 w-4" />
          Details
        </Button>
      )}
      {canEdit && current !== "edit" && (
        <Button nativeButton={false} render={<Link href={paths.edit} />}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      )}
    </div>
  );
}

function customerSchema(rows: B2BCustomer[], currentId?: number) {
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

type FormValues = z.infer<ReturnType<typeof customerSchema>>;

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

export function B2BCustomerForm({
  roleDef,
  customer,
}: {
  roleDef: RoleDef;
  customer?: B2BCustomer;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const tenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const companyId = customer?.companyId ?? resolveSessionCompanyKey(user) ?? 0;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const isEdit = Boolean(customer);

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

  const schema = useMemo(() => customerSchema(rows, customer?.b2bCustomerId), [rows, customer?.b2bCustomerId]);
  const parentOptions = useMemo(
    () => parentOptionsFor(rows, customer?.b2bCustomerId),
    [rows, customer?.b2bCustomerId]
  );

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
      b2bCustomerCode: customer?.b2bCustomerCode ?? "",
      b2bCustomerName: customer?.b2bCustomerName ?? "",
      b2bCustomerTypeId: customer?.b2bCustomerTypeId ?? 0,
      b2bCustomerCategoryId: customer?.b2bCustomerCategoryId ?? null,
      parentB2bCustomerId: customer?.parentB2bCustomerId ?? null,
      registrationNumber: customer?.registrationNumber ?? "",
      taxRegistrationNumber: customer?.taxRegistrationNumber ?? "",
      countryId: customer?.countryId ?? 0,
      currencyId: customer?.currencyId ?? 0,
      paymentTermId: customer?.paymentTermId ?? null,
      creditLimit: customer?.creditLimit ?? null,
      creditDays: customer?.creditDays ?? null,
      accountManagerId: customer?.accountManagerId ?? null,
      statusId: customer?.statusId ?? 0,
    },
  });

  const typeIdWatch = watch("b2bCustomerTypeId");
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.b2bCustomerTypeId === typeIdWatch),
    [categories, typeIdWatch]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (tenantId <= 0) {
        setLoading(false);
        setLoadError(platformMode ? "Select a tenant workspace to manage B2B customers." : "Missing tenant scope.");
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [typeRows, categoryRows, countryRows, currencyRows, paymentTermRows, employeeRows, statusTypeRows, customerRows] =
          await Promise.all([
            listB2BCustomerTypes({ tenantId, activeOnly: true }),
            listB2BCustomerCategories({ tenantId, activeOnly: true }),
            listCountries({ activeOnly: true }),
            listCurrencies({ activeOnly: true }),
            listPaymentTerms({ tenantId, activeOnly: true }),
            listEmployees({ tenantId, activeOnly: true }),
            listCommonStatusTypes({ tenantId, activeOnly: true }),
            listB2BCustomers({ tenantId }),
          ]);
        if (cancelled) return;
        setTypes(typeRows);
        setCategories(categoryRows);
        setCountries(countryRows);
        setCurrencies(currencyRows);
        setPaymentTerms(paymentTermRows);
        setEmployees(employeeRows);
        setRows(customerRows);
        const statusType = statusTypeRows.find((t) => t.statusTypeCode === STATUS_TYPE_CODE);
        setStatuses(
          statusType
            ? await listCommonStatuses({ tenantId, commonStatusTypeId: statusType.commonStatusTypeId, activeOnly: true })
            : []
        );
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof B2BCustomerTypesApiError ||
            error instanceof B2BCustomerCategoriesApiError ||
            error instanceof B2BCustomersApiError
            ? error.message
            : "Failed to load B2B customer form"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, platformMode]);

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
      if (isEdit && customer) {
        await updateB2BCustomer(customer.b2bCustomerId, { ...payload, isActive: customer.isActive, modifiedBy: userKey });
        toast.success("B2B customer updated");
        router.push(b2bCustomerPaths(role, customer.b2bCustomerId).view);
        return;
      }
      const created = await createB2BCustomer({ ...payload, createdBy: userKey });
      toast.success("B2B customer created");
      if (keepOpenForMore) {
        reset(blankValues());
        return;
      }
      router.push(b2bCustomerPaths(role, created.b2bCustomerId).details);
    } catch (error) {
      toast.error(error instanceof B2BCustomersApiError ? error.message : "Could not save B2B customer");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  const cancelHref = isEdit && customer ? b2bCustomerPaths(role, customer.b2bCustomerId).view : b2bCustomerPaths(role).list;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="b2bCustomerCode" required>
            Code
          </Label>
          <Input
            id="b2bCustomerCode"
            autoFocus
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
                disabled={!typeIdWatch}
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
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return parentOptions.find((p) => String(p.b2bCustomerId) === value)?.b2bCustomerName ?? "None";
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
          <Input id="registrationNumber" {...register("registrationNumber")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="taxRegistrationNumber">Tax registration number</Label>
          <Input id="taxRegistrationNumber" {...register("taxRegistrationNumber")} />
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
          <Input id="creditLimit" type="number" min={0} step="0.01" {...register("creditLimit")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="creditDays">Credit days</Label>
          <Input id="creditDays" type="number" min={0} {...register("creditDays")} />
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

        <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Create"}
          </Button>
          {!isEdit && (
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create &amp; add more
            </Button>
          )}
          <Button type="button" variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
