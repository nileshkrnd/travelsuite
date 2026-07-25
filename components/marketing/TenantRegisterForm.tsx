"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import {
  SAAS_MODULES,
  SAAS_PLANS,
  estimateMonthlyTotal,
  planIncludesModule,
  type SaasModuleId,
  type SaasPlanId,
} from "@/config/saasCatalog";
import { ICONS } from "@/lib/icon-registry";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useSubscriptionsStore } from "@/lib/store/subscriptions.store";
import { toCamelSlug } from "@/lib/slug";
import { SAAS_BRAND } from "@/config/saasBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const STEPS = ["Organization", "Modules", "Plan", "Review"] as const;

const orgSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  groupName: z.string().optional(),
  tenantSlug: z
    .string()
    .min(2, "Tenant code is required")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Letters and numbers only (camelCase)"),
  adminName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email("Enter a valid email"),
  dialCode: z.string().min(1, "Required"),
  phone: z.string().min(6, "Phone is required"),
  country: z.string().min(2, "Country is required"),
  city: z.string().min(2, "City is required"),
});

type OrgValues = z.infer<typeof orgSchema>;

export function TenantRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenants = useTenantsStore((s) => s.tenants);
  const addTenant = useTenantsStore((s) => s.addTenant);
  const registerSub = useSubscriptionsStore((s) => s.register);

  const [step, setStep] = useState(0);
  const [moduleIds, setModuleIds] = useState<SaasModuleId[]>([]);
  const [planId, setPlanId] = useState<SaasPlanId>("growth");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ slug: string; email: string; total: number } | null>(null);

  const form = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      organizationName: "",
      groupName: "",
      tenantSlug: "",
      adminName: "",
      adminEmail: "",
      dialCode: "+974",
      phone: "",
      country: "QA",
      city: "Doha",
    },
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const organizationName = form.watch("organizationName");

  useEffect(() => {
    if (slugTouched) return;
    const next = toCamelSlug(organizationName || "");
    if (next && next !== "role") form.setValue("tenantSlug", next, { shouldValidate: true });
  }, [organizationName, slugTouched, form]);

  // Prefill from landing deep-links (?plan=growth&modules=sales,hrms)
  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "starter" || plan === "growth" || plan === "enterprise") setPlanId(plan);

    const modulesParam = searchParams.get("modules");
    if (modulesParam) {
      const ids = modulesParam
        .split(",")
        .filter((id): id is SaasModuleId => SAAS_MODULES.some((m) => m.id === id));
      if (ids.length) setModuleIds(ids);
    }
  }, [searchParams]);

  // Ensure plan-included modules stay selected when the plan changes.
  useEffect(() => {
    const selectedPlan = SAAS_PLANS.find((p) => p.id === planId);
    if (!selectedPlan) return;
    if (selectedPlan.includedModules === "all") {
      setModuleIds(SAAS_MODULES.map((m) => m.id));
      return;
    }
    setModuleIds((prev) => {
      const included = selectedPlan.includedModules as SaasModuleId[];
      const merged = new Set<SaasModuleId>([...included, ...prev]);
      return SAAS_MODULES.map((m) => m.id).filter((id) => merged.has(id));
    });
  }, [planId]);

  const monthlyTotal = useMemo(() => estimateMonthlyTotal(planId, moduleIds), [planId, moduleIds]);
  const plan = SAAS_PLANS.find((p) => p.id === planId)!;

  function toggleModule(id: SaasModuleId) {
    if (planIncludesModule(plan, id) && plan.includedModules !== "all") {
      // Included modules stay on for the plan
      return;
    }
    if (plan.includedModules === "all") return;
    setModuleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function goNext() {
    if (step === 0) {
      const ok = await form.trigger();
      if (!ok) return;
      const slug = form.getValues("tenantSlug").trim();
      if (tenants.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) {
        form.setError("tenantSlug", { message: "This tenant code is already taken" });
        return;
      }
    }
    if (step === 1 && moduleIds.length === 0) {
      toast.error("Select at least one module");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit() {
    const values = form.getValues();
    setSubmitting(true);
    try {
      // Simulate provisioning delay
      await new Promise((r) => setTimeout(r, 700));
      const tenant = addTenant({
        name: values.organizationName.trim(),
        slug: values.tenantSlug.trim(),
        groupName: values.groupName?.trim() || values.organizationName.trim(),
        defaultCurrency: "USD",
        address: {
          line1: "Head Office",
          country: values.country.trim(),
          city: values.city.trim(),
          zip: "00000",
          timezone: "UTC",
        },
        contact: {
          email: values.adminEmail.trim(),
          dialCode: values.dialCode.trim(),
          phone: values.phone.trim(),
        },
      });
      registerSub({
        tenantId: tenant.id,
        organizationName: values.organizationName.trim(),
        tenantSlug: values.tenantSlug.trim(),
        groupName: values.groupName?.trim(),
        adminName: values.adminName.trim(),
        adminEmail: values.adminEmail.trim(),
        planId,
        moduleIds,
        monthlyTotal,
        country: values.country.trim(),
        city: values.city.trim(),
        phone: values.phone.trim(),
        dialCode: values.dialCode.trim(),
      });
      setDone({
        slug: tenant.slug,
        email: values.adminEmail.trim(),
        total: monthlyTotal,
      });
      toast.success("Tenant workspace created — trial started");
    } catch {
      toast.error("Could not complete registration");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your tenant is ready</h1>
          <p className="text-sm text-muted-foreground">
            14-day trial is active for <span className="font-medium text-foreground">{done.slug}</span>.
            Estimated subscription:{" "}
            <span className="font-medium text-foreground">${done.total}/mo</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in with Super Admin demo credentials, or use tenant code{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{done.slug}</code> on
            the login screen. Admin email on file: {done.email}.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button nativeButton={false} render={<Link href={`/login`} />} className="bg-teal-700 text-white hover:bg-teal-600">
            Go to sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button nativeButton={false} render={<Link href="/" />} variant="outline">
            Back to product
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          {SAAS_BRAND.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Register as a tenant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your {SAAS_BRAND.name} workspace and choose modules for travel, property, CRM, and apps.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              i === step
                ? "bg-teal-700 text-white"
                : i < step
                  ? "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form className="space-y-5 rounded-2xl border border-border bg-card p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="organizationName">Organization name</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="organizationName"
                  className="ps-9"
                  placeholder="e.g. Regency Travel & Tours"
                  {...form.register("organizationName")}
                />
              </div>
              {form.formState.errors.organizationName && (
                <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupName">Holding / group (optional)</Label>
              <Input id="groupName" placeholder="e.g. Regency Group Holding" {...form.register("groupName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Tenant code</Label>
              <Input
                id="tenantSlug"
                placeholder="regencyTravel"
                {...form.register("tenantSlug", {
                  onChange: () => setSlugTouched(true),
                })}
              />
              {form.formState.errors.tenantSlug && (
                <p className="text-sm text-destructive">{form.formState.errors.tenantSlug.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input id="adminName" className="ps-9" {...form.register("adminName")} />
              </div>
              {form.formState.errors.adminName && (
                <p className="text-sm text-destructive">{form.formState.errors.adminName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input id="adminEmail" type="email" className="ps-9" {...form.register("adminEmail")} />
              </div>
              {form.formState.errors.adminEmail && (
                <p className="text-sm text-destructive">{form.formState.errors.adminEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialCode">Dial code</Label>
              <Input id="dialCode" placeholder="+974" {...form.register("dialCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input id="phone" className="ps-9" {...form.register("phone")} />
              </div>
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country code</Label>
              <Input id="country" placeholder="QA" {...form.register("country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Doha" {...form.register("city")} />
            </div>
          </div>
        </form>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Included plan modules are locked on. Add optional modules as needed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAAS_MODULES.map((mod) => {
              const Icon = ICONS[mod.icon];
              const included = planIncludesModule(plan, mod.id);
              const checked = moduleIds.includes(mod.id);
              const locked = included || plan.includedModules === "all";
              return (
                <label
                  key={mod.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                    checked ? "border-teal-600/50 bg-teal-50/60 dark:bg-teal-950/30" : "border-border hover:bg-muted/40",
                    locked && "cursor-default"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={() => toggleModule(mod.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4 text-teal-700 dark:text-teal-400" />}
                      <span className="text-sm font-semibold">{mod.name}</span>
                      {included && (
                        <span className="rounded-full bg-teal-700/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-200">
                          Included
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{mod.tagline}</span>
                    {!included && plan.includedModules !== "all" && (
                      <span className="mt-2 block text-xs font-medium tabular-nums">+${mod.monthlyPrice}/mo</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          {SAAS_PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={cn(
                "rounded-xl border p-5 text-left transition-colors",
                planId === p.id ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/40" : "border-border hover:bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
                <p className="text-lg font-semibold tabular-nums">${p.monthlyPrice}</p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {h}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Review subscription</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium">{form.getValues("organizationName")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tenant code</dt>
              <dd className="font-mono text-xs font-medium">{form.getValues("tenantSlug")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Admin</dt>
              <dd className="font-medium">
                {form.getValues("adminName")} · {form.getValues("adminEmail")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{plan.name}</dd>
            </div>
          </dl>
          <div>
            <p className="text-sm text-muted-foreground">Modules ({moduleIds.length})</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {moduleIds.map((id) => {
                const mod = SAAS_MODULES.find((m) => m.id === id);
                return (
                  <li key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                    <Check className="h-3 w-3 text-teal-600" />
                    {mod?.name}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="border-t border-border pt-4 text-sm">
            Estimated monthly total{" "}
            <span className="text-xl font-semibold tabular-nums">${monthlyTotal}</span>
            <span className="text-muted-foreground"> · 14-day free trial (prototype)</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} className="bg-teal-700 text-white hover:bg-teal-600">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="bg-teal-700 text-white hover:bg-teal-600"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Provisioning…" : "Start trial"}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have a workspace?{" "}
        <button type="button" className="font-medium text-teal-700 hover:underline dark:text-teal-400" onClick={() => router.push("/login")}>
          Sign in
        </button>
      </p>
    </div>
  );
}
