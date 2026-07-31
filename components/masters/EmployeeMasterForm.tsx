"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Phone, Hash, Lock, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePickerField } from "@/components/ui/date-picker";
import { ImageUploadField } from "@/components/masters/ImageUploadField";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listBranches } from "@/lib/services/db-branches.service";
import { listDesignations } from "@/lib/services/designations.service";
import { listDepartments } from "@/lib/services/departments.service";
import { listAccessRoles } from "@/lib/services/access-roles.service";
import {
  createEmployee,
  updateEmployee,
  listEmployees,
  EmployeesApiError,
} from "@/lib/services/employees.service";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import type {
  AccessRole,
  Branch,
  City,
  Company,
  Country,
  Department,
  Designation,
  Employee,
} from "@/types";
import { employeeDisplayName } from "@/types/employee";

const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Mx"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;

const phoneRegex = /^[0-9+\-\s()]{5,20}$/;

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function parsePositiveId(raw: string): number {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function isTitle(value: string): value is (typeof TITLES)[number] {
  return (TITLES as readonly string[]).includes(value);
}

function isGender(value: string): value is (typeof GENDERS)[number] {
  return (GENDERS as readonly string[]).includes(value);
}

function resolveDialCode(raw: string | undefined, countries: Country[], countryId?: number): string {
  if (countryId) {
    const byCountry = countries.find((c) => c.countryKey === countryId);
    if (byCountry?.dialCode) return byCountry.dialCode.slice(0, 5);
  }
  if (!raw) return "";
  const exact = countries.find((c) => c.dialCode === raw);
  if (exact) return exact.dialCode.slice(0, 5);
  const withPlus = raw.startsWith("+") ? raw : `+${raw}`;
  const match = countries.find((c) => c.dialCode === withPlus);
  if (match) return match.dialCode.slice(0, 5);
  return withPlus.slice(0, 5);
}

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function useSchema(isCreate: boolean) {
  return z.object({
    title: z.string().refine(isTitle, { message: "Title is required" }),
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    gender: z.string().refine(isGender, { message: "Gender is required" }),
    countryId: z.number().int().positive("Country is required"),
    cityId: z.number().int().positive("City is required"),
    countryDialCode: z
      .string()
      .trim()
      .min(1, "Dial code is required")
      .max(5, "Dial code must be at most 5 characters")
      .regex(/^\+?[0-9]{1,4}$/, "Select a dial code from Country Master"),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .max(20)
      .regex(phoneRegex, "Enter a valid phone number"),
    faxNumber: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || phoneRegex.test(v), "Enter a valid fax number"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(50),
    address: z.string().trim().min(1, "Address is required").max(50, "Address must be at most 50 characters"),
    employeeNumber: z.string().trim().min(1, "Employee number is required").max(50),
    companyId: z.number().int().positive("Company is required"),
    branchId: z.number().int().positive("Branch is required"),
    designationId: z.number().int().positive("Designation is required"),
    departmentId: z.number().int().min(0),
    accessRoleId: z.number().int().positive("Access role is required"),
    reportingEmployeeId: z.number().int().min(0),
    joiningDate: z.string().trim().min(1, "Joining date is required"),
    password: isCreate
      ? z.string().min(6, "Password must be at least 6 characters")
      : z
          .string()
          .optional()
          .or(z.literal(""))
          .refine((v) => !v || v.length >= 6, "Password must be at least 6 characters"),
    employeeImage: z.string().max(100).optional().or(z.literal("")),
  });
}

type FormValues = z.infer<ReturnType<typeof useSchema>>;

function emptyFormValues(): FormValues {
  return {
    title: "",
    firstName: "",
    lastName: "",
    gender: "",
    countryId: 0,
    cityId: 0,
    countryDialCode: "",
    phoneNumber: "",
    faxNumber: "",
    email: "",
    address: "",
    employeeNumber: "",
    companyId: 0,
    branchId: 0,
    designationId: 0,
    departmentId: 0,
    accessRoleId: 0,
    reportingEmployeeId: 0,
    joiningDate: "",
    password: "",
    employeeImage: "",
  } as unknown as FormValues;
}

function formValuesFromEmployee(employee: Employee): FormValues {
  return {
    title: isTitle(employee.title) ? employee.title : "",
    firstName: employee.firstName,
    lastName: employee.lastName,
    gender: isGender(employee.gender) ? employee.gender : "",
    countryId: employee.countryId,
    cityId: employee.cityId,
    countryDialCode: employee.countryDialCode,
    phoneNumber: employee.phoneNumber,
    faxNumber: employee.faxNumber ?? "",
    email: employee.email,
    address: employee.address,
    employeeNumber: employee.employeeNumber,
    companyId: employee.companyId,
    branchId: employee.branchId,
    designationId: employee.designationId,
    departmentId: employee.departmentId ?? 0,
    accessRoleId: employee.accessRoleId,
    reportingEmployeeId: employee.reportingEmployeeId ?? 0,
    joiningDate: toDateInputValue(employee.joiningDate),
    password: "",
    employeeImage: employee.employeeImage ?? "",
  } as unknown as FormValues;
}

export function EmployeeMasterForm({ employee }: { employee?: Employee }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const isEdit = !!employee;
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [reportingEmployees, setReportingEmployees] = useState<Employee[]>([]);

  const schema = useMemo(() => useSchema(!isEdit), [isEdit]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    mode: "onBlur",
    // Avoid controlled `values` — it resets dropdowns on every re-render and blocks selection.
    defaultValues: employee ? formValuesFromEmployee(employee) : emptyFormValues(),
  });

  const editEmployeeId = employee?.employeeId ?? 0;
  useEffect(() => {
    if (editEmployeeId > 0 && employee) {
      reset(formValuesFromEmployee(employee));
    }
  }, [editEmployeeId, employee, reset]);

  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const titleValue = useWatch({ control, name: "title" });
  const countryId = useWatch({ control, name: "countryId" });
  const companyId = useWatch({ control, name: "companyId" });
  const imageValue = useWatch({ control, name: "employeeImage" });

  const previewName =
    employeeDisplayName({
      title: titleValue && isTitle(titleValue) ? titleValue : "Mr",
      firstName: firstName ?? "",
      lastName: lastName ?? "",
    }) || "Employee name";

  const dialOptions = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries) {
      if (c.dialCode && !map.has(c.dialCode)) map.set(c.dialCode, c);
    }
    return [...map.values()].sort((a, b) => a.dialCode.localeCompare(b.dialCode));
  }, [countries]);

  useEffect(() => {
    void listCountries({ activeOnly: true }).then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (tenantKey <= 0) {
      setCompanies([]);
      return;
    }
    let cancelled = false;
    listCompanies({ tenantId: tenantKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setCompanies(rows);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  useEffect(() => {
    if (!countries.length || !employee) return;
    const resolved = resolveDialCode(employee.countryDialCode, countries, employee.countryId);
    if (resolved) setValue("countryDialCode", resolved, { shouldValidate: false });
  }, [countries, employee, setValue]);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        const currentCityId = getValues("cityId");
        if (currentCityId && !rows.some((c) => c.cityKey === currentCityId)) {
          setValue("cityId", 0, { shouldValidate: false });
        }
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when country changes
  }, [countryId]);

  useEffect(() => {
    if (!companyId) {
      setBranches([]);
      setDesignations([]);
      setDepartments([]);
      setReportingEmployees([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      listBranches({ companyId, activeOnly: true }),
      listDesignations({ tenantId: tenantKey, companyId, activeOnly: true }),
      listDepartments({ tenantId: tenantKey, companyId, activeOnly: true }),
      listEmployees({ tenantId: tenantKey, companyId, activeOnly: true }),
    ])
      .then(([branchRows, designationRows, departmentRows, employeeRows]) => {
        if (cancelled) return;
        setBranches(branchRows);
        setDesignations(designationRows);
        setDepartments(departmentRows);
        setReportingEmployees(
          employeeRows.filter((e) => e.employeeId !== employee?.employeeId)
        );
      })
      .catch(() => {
        if (cancelled) return;
        setBranches([]);
        setDesignations([]);
        setDepartments([]);
        setReportingEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, tenantKey, employee?.employeeId]);

  useEffect(() => {
    if (tenantKey <= 0) {
      setAccessRoles([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      listAccessRoles({ tenantId: tenantKey, companyId: 0, activeOnly: true }),
      companyId > 0
        ? listAccessRoles({ tenantId: tenantKey, companyId, activeOnly: true })
        : Promise.resolve([] as AccessRole[]),
    ])
      .then(([tenantRoles, companyRoles]) => {
        if (cancelled) return;
        const map = new Map<number, AccessRole>();
        for (const r of [...tenantRoles, ...companyRoles]) map.set(r.accessRoleId, r);
        setAccessRoles(
          [...map.values()].sort((a, b) => a.accessRoleName.localeCompare(b.accessRoleName))
        );
      })
      .catch(() => {
        if (!cancelled) setAccessRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (tenantKey <= 0) {
      toast.error("Select a tenant workspace before saving employees.");
      return;
    }

    const masterDial = resolveDialCode(values.countryDialCode, countries, values.countryId);
    if (!countries.some((c) => c.dialCode === masterDial)) {
      toast.error("Dial code must come from Country Master");
      return;
    }

    const payload = {
      title: values.title,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      gender: values.gender,
      countryDialCode: masterDial.slice(0, 5),
      phoneNumber: values.phoneNumber.trim(),
      faxNumber: values.faxNumber?.trim() || null,
      email: values.email.trim(),
      address: values.address.trim(),
      countryId: values.countryId,
      cityId: values.cityId,
      employeeNumber: values.employeeNumber.trim(),
      designationId: values.designationId,
      joiningDate: values.joiningDate,
      accessRoleId: values.accessRoleId,
      departmentId: values.departmentId > 0 ? values.departmentId : null,
      reportingEmployeeId: values.reportingEmployeeId > 0 ? values.reportingEmployeeId : null,
      companyId: values.companyId,
      branchId: values.branchId,
      employeeImage: values.employeeImage?.trim() || null,
      tenantId: tenantKey,
      isActive: employee?.isActive ?? true,
    };

    try {
      if (isEdit && employee) {
        const updatePayload: Parameters<typeof updateEmployee>[1] = {
          ...payload,
          modifiedBy: actorKey,
        };
        if (values.password?.trim()) {
          updatePayload.password = values.password.trim();
        }
        const saved = await updateEmployee(employee.employeeId, updatePayload);
        toast.success("Employee updated");
        router.push(`/${role}/masters/employee/${saved.employeeId}`);
      } else {
        const saved = await createEmployee({
          ...payload,
          password: values.password!.trim(),
          createdBy: actorKey,
        });
        toast.success("Employee created");
        router.push(`/${role}/masters/employee/${saved.employeeId}`);
      }
    } catch (error) {
      toast.error(error instanceof EmployeesApiError ? error.message : "Could not save employee");
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
      <Card className="min-w-0 overflow-x-clip">
        <CardContent className="min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="emp-title" required>
                  Title
                </Label>
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <select
                      id="emp-title"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.title}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">Select title</option>
                      {TITLES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" required>
                  First name
                </Label>
                <Input id="firstName" autoFocus aria-invalid={!!errors.firstName} {...register("firstName")} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" required>
                  Last name
                </Label>
                <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-gender" required>
                  Gender
                </Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <select
                      id="emp-gender"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.gender}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeNumber" required>
                  Employee number
                </Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employeeNumber"
                    className="h-10 ps-9"
                    aria-invalid={!!errors.employeeNumber}
                    {...register("employeeNumber")}
                  />
                </div>
                {errors.employeeNumber && (
                  <p className="text-sm text-destructive">{errors.employeeNumber.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-country" required>
                  Country
                </Label>
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <select
                      id="emp-country"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.countryId}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => {
                        const id = parsePositiveId(e.target.value);
                        field.onChange(id);
                        setValue("cityId", 0, { shouldValidate: false });
                        const selected = countries.find((c) => c.countryKey === id);
                        if (selected?.dialCode) {
                          setValue("countryDialCode", selected.dialCode.slice(0, 5), { shouldValidate: true });
                        }
                      }}
                    >
                      <option value="">Select country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={String(c.countryKey)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-city" required>
                  City
                </Label>
                <Controller
                  control={control}
                  name="cityId"
                  render={({ field }) => (
                    <select
                      id="emp-city"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.cityId}
                      disabled={!countryId || cities.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">
                        {!countryId
                          ? "Select a country first"
                          : cities.length === 0
                            ? "No cities for this country"
                            : "Select city"}
                      </option>
                      {cities.map((c) => (
                        <option key={c.id} value={String(c.cityKey)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.cityId && <p className="text-sm text-destructive">{errors.cityId.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-2">
                <div className="w-full shrink-0 space-y-2 sm:w-[8.5rem]">
                  <Label htmlFor="emp-dial" required>
                    Dial code
                  </Label>
                  <Controller
                    control={control}
                    name="countryDialCode"
                    render={({ field }) => (
                      <select
                        id="emp-dial"
                        className={nativeSelectClass}
                        aria-invalid={!!errors.countryDialCode}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="">Code</option>
                        {dialOptions.map((c) => (
                          <option key={c.dialCode} value={c.dialCode}>
                            {c.dialCode} · {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="phoneNumber" required>
                    Phone number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      className="h-10 ps-9"
                      aria-invalid={!!errors.phoneNumber}
                      {...register("phoneNumber")}
                    />
                  </div>
                </div>
              </div>
              {(errors.countryDialCode || errors.phoneNumber) && (
                <p className="text-sm text-destructive">
                  {errors.countryDialCode?.message ?? errors.phoneNumber?.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="faxNumber">Fax number</Label>
                <Input id="faxNumber" placeholder="Optional" aria-invalid={!!errors.faxNumber} {...register("faxNumber")} />
                {errors.faxNumber && <p className="text-sm text-destructive">{errors.faxNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email (login username)
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="h-10 ps-9"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" required>
                Address
              </Label>
              <Input id="address" maxLength={50} aria-invalid={!!errors.address} {...register("address")} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-company" required>
                  Company
                </Label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <select
                      id="emp-company"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.companyId}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => {
                        const id = parsePositiveId(e.target.value);
                        field.onChange(id);
                        setValue("branchId", 0, { shouldValidate: false });
                        setValue("designationId", 0, { shouldValidate: false });
                        setValue("departmentId", 0, { shouldValidate: false });
                        setValue("reportingEmployeeId", 0, { shouldValidate: false });
                      }}
                    >
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={String(c.companyKey)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-branch" required>
                  Branch
                </Label>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <select
                      id="emp-branch"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.branchId}
                      disabled={!companyId || branches.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">
                        {!companyId
                          ? "Select a company first"
                          : branches.length === 0
                            ? "No branches for this company"
                            : "Select branch"}
                      </option>
                      {branches.map((b) => (
                        <option key={b.id} value={String(b.branchKey)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-designation" required>
                  Designation
                </Label>
                <Controller
                  control={control}
                  name="designationId"
                  render={({ field }) => (
                    <select
                      id="emp-designation"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.designationId}
                      disabled={!companyId || designations.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">
                        {!companyId
                          ? "Select a company first"
                          : designations.length === 0
                            ? "No designations for this company"
                            : "Select designation"}
                      </option>
                      {designations.map((d) => (
                        <option key={d.designationId} value={String(d.designationId)}>
                          {d.designationName} ({d.designationCode})
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.designationId && (
                  <p className="text-sm text-destructive">{errors.designationId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-department">Department</Label>
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <select
                      id="emp-department"
                      className={nativeSelectClass}
                      disabled={!companyId}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">None (optional)</option>
                      {departments.map((d) => (
                        <option key={d.departmentId} value={String(d.departmentId)}>
                          {d.departmentName} ({d.departmentCode})
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-access-role" required>
                  Access role
                </Label>
                <Controller
                  control={control}
                  name="accessRoleId"
                  render={({ field }) => (
                    <select
                      id="emp-access-role"
                      className={nativeSelectClass}
                      aria-invalid={!!errors.accessRoleId}
                      disabled={accessRoles.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">
                        {accessRoles.length === 0 ? "No access roles available" : "Select access role"}
                      </option>
                      {accessRoles.map((r) => (
                        <option key={r.accessRoleId} value={String(r.accessRoleId)}>
                          {r.accessRoleName}
                          {r.companyId === 0 ? " (tenant)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.accessRoleId && (
                  <p className="text-sm text-destructive">{errors.accessRoleId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-reporting">Reporting to</Label>
                <Controller
                  control={control}
                  name="reportingEmployeeId"
                  render={({ field }) => (
                    <select
                      id="emp-reporting"
                      className={nativeSelectClass}
                      disabled={!companyId || reportingEmployees.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parsePositiveId(e.target.value))}
                    >
                      <option value="">None (optional)</option>
                      {reportingEmployees.map((e) => (
                        <option key={e.employeeId} value={String(e.employeeId)}>
                          {employeeDisplayName(e)}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="joiningDate" required>
                  Joining date
                </Label>
                <Controller
                  name="joiningDate"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      id="joiningDate"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select joining date"
                      invalid={!!errors.joiningDate}
                    />
                  )}
                />
                {errors.joiningDate && <p className="text-sm text-destructive">{errors.joiningDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" required={!isEdit}>
                  {isEdit ? "New password (optional)" : "Password"}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isEdit ? "new-password" : "new-password"}
                    placeholder={isEdit ? "Leave blank to keep current" : "Min 6 characters"}
                    className="h-10 ps-9"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
            </div>

            <Controller
              control={control}
              name="employeeImage"
              render={({ field }) => (
                <ImageUploadField
                  id="employeeImage"
                  label="Employee photo"
                  folder="employees"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.employeeImage?.message}
                  hint="Optional · PNG, JPG, WEBP · max 512 KB"
                />
              )}
            />

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Create employee"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={
                      isEdit
                        ? `/${role}/masters/employee/${employee!.employeeId}`
                        : `/${role}/masters/employee`
                    }
                  />
                }
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-x-clip bg-muted/40 lg:sticky lg:top-6">
        <CardContent className="min-w-0 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            {imageValue ? (
              <img
                src={imageValue}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
                aria-hidden
              >
                {initials(previewName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
              <Badge variant="default" className="mt-0.5">
                {employee?.isActive === false ? "inactive" : "active"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
