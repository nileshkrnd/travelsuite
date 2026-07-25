"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { GitBranch, Hash, Building2, Globe2, Building, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useHydrateReferenceMasters, useCitiesForCountry } from "@/lib/hooks/useReferenceMasters";
import { useReferenceStore } from "@/lib/store/reference.store";
import type { Branch } from "@/types";

function useBranchSchema(branches: Branch[], currentId?: string) {
  return z.object({
    name: z.string().min(1, "Branch name is required"),
    code: z
      .string()
      .min(1, "Branch code is required")
      .max(30, "Branch code must be 30 characters or fewer")
      .refine(
        (value) => !branches.some((b) => b.id !== currentId && b.code.toLowerCase() === value.trim().toLowerCase()),
        "This branch code is already in use"
      ),
    companyId: z.string().min(1, "Select a company"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
  });
}

type FormValues = z.infer<ReturnType<typeof useBranchSchema>>;

/** Shared Create/Modify form for the Branch master — used by both the "new" and "edit" pages. */
export function BranchForm({ branch }: { branch?: Branch }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const branches = useBranchesStore((s) => s.branches);
  const addBranch = useBranchesStore((s) => s.addBranch);
  const updateBranch = useBranchesStore((s) => s.updateBranch);
  const companies = useCompaniesStore((s) => s.companies);
  const countries = useReferenceStore((s) => s.countries);
  const { loading: referenceLoading, error: referenceError } = useHydrateReferenceMasters();
  const schema = useBranchSchema(branches, branch?.id);
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: branch?.name ?? "",
      code: branch?.code ?? "",
      companyId: branch?.companyId ?? companies[0]?.id ?? "",
      country: branch?.country ?? "",
      city: branch?.city ?? "",
    },
  });

  const nameValue = useWatch({ control, name: "name" });
  const countryValue = useWatch({ control, name: "country" });
  const { cities: cityOptions, loading: citiesLoading } = useCitiesForCountry(countryValue || undefined);
  const previewName = nameValue?.trim() || "Branch name";

  async function onSubmit(values: FormValues) {
    if (isEdit && branch) {
      updateBranch(branch.id, {
        name: values.name.trim(),
        code: values.code.trim(),
        companyId: values.companyId,
        country: values.country,
        city: values.city,
      });
      toast.success("Branch updated");
      router.push(`/${role}/masters/branch/${branch.id}`);
    } else {
      const created = addBranch({
        name: values.name.trim(),
        code: values.code.trim(),
        companyId: values.companyId,
        country: values.country,
        city: values.city,
      });
      toast.success("Branch created");
      router.push(`/${role}/masters/branch/${created.id}`);
    }
  }

  if (companies.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add a company first — branches belong to a company. Go to Masters → Company to create one.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (referenceLoading) {
    return <div className="text-sm text-muted-foreground">Loading country and city masters…</div>;
  }

  if (referenceError) {
    return <div className="text-sm text-destructive">{referenceError}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Branch name
              </Label>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  autoFocus
                  placeholder="e.g. Mumbai"
                  aria-invalid={!!errors.name}
                  className="h-10 ps-9"
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code" required>
                  Branch code
                </Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    placeholder="e.g. mumbai"
                    aria-invalid={!!errors.code}
                    className="h-10 ps-9"
                    {...register("code")}
                  />
                </div>
                {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
              </div>

              <div className="space-y-2">
                <Label required>Company</Label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                      <SelectTrigger className="h-10 w-full">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <SelectValue>
                          {(value: string | null) =>
                            value ? (companies.find((c) => c.id === value)?.name ?? value) : "Select company"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label required>Country</Label>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value ?? "");
                        setValue("city", "");
                      }}
                    >
                        <SelectTrigger className="h-10 w-full">
                          <Globe2 className="h-4 w-4 text-muted-foreground" />
                          <SelectValue>
                            {(value: string | null) =>
                              value
                                ? (countries.find((c) => c.code === value)?.name ?? value)
                                : "Select country"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  )}
                />
                {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
              </div>

              <div className="space-y-2">
                <Label required>City</Label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={!countryValue}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <SelectValue
                          placeholder={
                            !countryValue
                              ? "Select a country first"
                              : citiesLoading
                                ? "Loading cities…"
                                : "Select city"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((city) => (
                          <SelectItem key={city.id} value={city.name}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Create branch"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/branch/${branch.id}` : `/${role}/masters/branch`} />
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden
            >
              <GitBranch className="h-4 w-4" />
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
