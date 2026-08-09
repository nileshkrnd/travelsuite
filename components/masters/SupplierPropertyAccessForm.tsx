"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Save, ShieldCheck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertySuppliers } from "@/lib/services/property-suppliers.service";
import { listSupplierUsers } from "@/lib/services/supplier-users.service";
import {
  createSupplierPropertyAccess,
  updateSupplierPropertyAccess,
  SupplierPropertyAccessApiError,
} from "@/lib/services/supplier-property-access.service";
import type { PropertySupplier, SupplierPropertyAccess, SupplierUser } from "@/types";

const FLAGS = [
  { key: "canView", label: "View rates" },
  { key: "canCreateRate", label: "Create rate" },
  { key: "canEditRate", label: "Edit rate" },
  { key: "canSubmitRate", label: "Submit rate" },
  { key: "canApproveRate", label: "Approve rate" },
] as const;

const schema = z
  .object({
    propertySupplierId: z.number().int().positive("Property / supplier link is required"),
    userId: z.number().int().positive("Supplier user is required"),
    canView: z.boolean(),
    canCreateRate: z.boolean(),
    canEditRate: z.boolean(),
    canSubmitRate: z.boolean(),
    canApproveRate: z.boolean(),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });
type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    propertySupplierId: 0,
    userId: 0,
    canView: true,
    canCreateRate: false,
    canEditRate: false,
    canSubmitRate: false,
    canApproveRate: false,
    validFrom: "",
    validTo: "",
    isActive: true,
  };
}

function valuesFromEntry(entry: SupplierPropertyAccess): FormValues {
  return {
    propertySupplierId: entry.propertySupplierId,
    userId: entry.userKey,
    canView: entry.canView,
    canCreateRate: entry.canCreateRate,
    canEditRate: entry.canEditRate,
    canSubmitRate: entry.canSubmitRate,
    canApproveRate: entry.canApproveRate,
    validFrom: entry.validFrom ?? "",
    validTo: entry.validTo ?? "",
    isActive: entry.isActive,
  };
}

/** Shared Grant / Modify form for a supplier user's rate-management access to one property link. */
export function SupplierPropertyAccessForm({ entry }: { entry?: SupplierPropertyAccess }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;

  const [links, setLinks] = useState<PropertySupplier[]>([]);
  const [supplierUsers, setSupplierUsers] = useState<SupplierUser[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    handleSubmit,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : emptyValues(),
  });

  const propertySupplierId = useWatch({ control, name: "propertySupplierId" });
  const userId = useWatch({ control, name: "userId" });
  const isActive = useWatch({ control, name: "isActive" });
  const selectedLink = links.find((l) => l.propertySupplierKey === propertySupplierId);
  const eligibleUsers = selectedLink
    ? supplierUsers.filter((u) => u.supplierId === selectedLink.supplierId)
    : [];

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([listPropertySuppliers({ tenantId: tenantKey }), listSupplierUsers({ tenantId: tenantKey })])
      .then(([linkRows, userRows]) => {
        if (cancelled) return;
        setLinks(linkRows);
        setSupplierUsers(userRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load property / supplier links");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertySupplierId: values.propertySupplierId,
      userId: values.userId,
      canView: values.canView,
      canCreateRate: values.canCreateRate,
      canEditRate: values.canEditRate,
      canSubmitRate: values.canSubmitRate,
      canApproveRate: values.canApproveRate,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
      isActive: values.isActive,
    };
    try {
      if (isEdit && entry) {
        const saved = await updateSupplierPropertyAccess(entry.supplierPropertyAccessKey, payload);
        toast.success("Access updated");
        router.push(`/${role}/masters/supplier-property-access/${saved.supplierPropertyAccessKey}`);
      } else {
        const saved = await createSupplierPropertyAccess({ ...payload, createdBy: actorKey });
        toast.success("Access granted");
        router.push(`/${role}/masters/supplier-property-access/${saved.supplierPropertyAccessKey}`);
      }
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not save access grant");
    }
  }

  if (loading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-3 py-8 text-sm">
          <p className="font-medium">Link a property to a supplier first</p>
          <p className="text-muted-foreground">
            Rate access is granted on a property/supplier link — create one under Masters → Property Supplier.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/property-supplier`} />}
          >
            Go to property suppliers
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedUser = eligibleUsers.find((u) => u.userKey === userId);
  const previewLink = selectedLink
    ? `${selectedLink.propertyName ?? `Property ${selectedLink.propertyId}`} — ${selectedLink.supplierName ?? `Supplier ${selectedLink.supplierId}`}`
    : "Select a property / supplier link";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <Section
          icon={ShieldCheck}
          title="Link & user"
          description="Which property/supplier link this access applies to, and who receives it."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label required>Property / Supplier link</Label>
              <Controller
                control={control}
                name="propertySupplierId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || null}
                    onChange={(v) => field.onChange(v)}
                    options={links.map((l) => ({
                      value: l.propertySupplierKey,
                      label: `${l.propertyName ?? `Property ${l.propertyId}`} — ${l.supplierName ?? `Supplier ${l.supplierId}`}`,
                      sublabel: l.propertyCode,
                    }))}
                    placeholder="Search property or supplier…"
                    emptyLabel="No property/supplier links found."
                    disabled={isEdit}
                    ariaInvalid={!!errors.propertySupplierId}
                  />
                )}
              />
              {errors.propertySupplierId && (
                <p className="text-sm text-destructive">{errors.propertySupplierId.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label required>Supplier user</Label>
              <Controller
                control={control}
                name="userId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || null}
                    onChange={(v) => field.onChange(v)}
                    options={eligibleUsers.map((u) => ({
                      value: u.userKey,
                      label: `${u.firstName} ${u.lastName}`.trim(),
                      sublabel: u.email,
                    }))}
                    placeholder={selectedLink ? "Search supplier user…" : "Select a link first"}
                    emptyLabel="No portal users for this supplier yet."
                    disabled={isEdit || !selectedLink}
                    ariaInvalid={!!errors.userId}
                  />
                )}
              />
              {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
            </div>
          </div>
        </Section>

        <Section icon={ShieldCheck} title="Rate permissions" description="What this user can do with rates on this property.">
          <div className="grid gap-3 sm:grid-cols-2">
            {FLAGS.map((flag) => (
              <Controller
                key={flag.key}
                control={control}
                name={flag.key}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                    {flag.label}
                  </label>
                )}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid from</Label>
              <Input id="validFrom" type="date" {...register("validFrom")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid to</Label>
              <Input id="validTo" type="date" {...register("validTo")} />
              {errors.validTo && <p className="text-sm text-destructive">{errors.validTo.message}</p>}
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "active" : "inactive"}
                      onValueChange={(v) => field.onChange(v === "active")}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => (value === "active" ? "Active" : "Inactive")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Grant access"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit
                    ? `/${role}/masters/supplier-property-access/${entry.supplierPropertyAccessKey}`
                    : `/${role}/masters/supplier-property-access`
                }
              />
            }
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-24 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{previewLink}</p>
              <p className="truncate text-xs text-white/75">{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "Select a supplier user"}</p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "active" : "inactive"}</Badge>
            <p className="text-xs text-muted-foreground">
              Controls what a supplier&apos;s portal user can do with rates on this property.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
