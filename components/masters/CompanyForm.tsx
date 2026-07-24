"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, Hash, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import type { Company } from "@/types";

function useCompanySchema(companies: Company[], currentId?: string) {
  return z.object({
    name: z.string().min(1, "Company name is required"),
    code: z
      .string()
      .min(1, "Company code is required")
      .max(30, "Company code must be 30 characters or fewer")
      .refine(
        (value) => !companies.some((c) => c.id !== currentId && c.code.toLowerCase() === value.trim().toLowerCase()),
        "This company code is already in use"
      ),
  });
}

type FormValues = z.infer<ReturnType<typeof useCompanySchema>>;

/** Shared Create/Modify form for the Company master — used by both the "new" and "edit" pages. */
export function CompanyForm({ company }: { company?: Company }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const companies = useCompaniesStore((s) => s.companies);
  const addCompany = useCompaniesStore((s) => s.addCompany);
  const updateCompany = useCompaniesStore((s) => s.updateCompany);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const schema = useCompanySchema(companies, company?.id);
  const isEdit = !!company;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: company?.name ?? "", code: company?.code ?? "" },
  });

  const nameValue = useWatch({ control, name: "name" });
  const previewName = nameValue?.trim() || "Your company";

  async function onSubmit(values: FormValues) {
    if (isEdit && company) {
      updateCompany(company.id, { name: values.name.trim(), code: values.code.trim() });
      toast.success("Company updated");
      router.push(`/${role}/masters/company/${company.id}`);
    } else {
      const created = addCompany({ name: values.name.trim(), code: values.code.trim() });
      toast.success("Company created");
      router.push(`/${role}/masters/company/${created.id}`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  autoFocus
                  placeholder="e.g. Horizon Leisure"
                  aria-invalid={!!errors.name}
                  className="h-10 ps-9"
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Company code</Label>
              <div className="relative">
                <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  placeholder="e.g. horizonLeisure"
                  aria-invalid={!!errors.code}
                  className="h-10 ps-9"
                  {...register("code")}
                />
              </div>
              {errors.code ? (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">camelCase or lowercase, no spaces or special characters.</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Create company"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/company/${company.id}` : `/${role}/masters/company`} />
                }
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
              style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
              aria-hidden
            >
              {initials(previewName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
              <Badge variant="default" className="mt-0.5">
                active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
