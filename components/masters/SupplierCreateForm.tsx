"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Store,
  Contact,
  MapPin,
  Landmark,
  Banknote,
  Save,
  X,
  Loader2,
  Info,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { listSupplierTypes } from "@/lib/services/supplier-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import type { City, Country, Currency, SupplierTypeMaster } from "@/types";

const NONE = "__none__";

function optionalId() {
  return z.preprocess(
    (v) => (v === "" || v === NONE || v === 0 || v == null ? null : Number(v)),
    z.number().int().positive().nullable()
  );
}

function optionalNumber() {
  return z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().nullable());
}

const PAYMENT_TERMS = ["Advance Payment", "Net 15", "Net 30", "Net 45", "Net 60", "On Credit"];

const schema = z.object({
  supplierCode: z.string().trim().max(50).optional().or(z.literal("")),
  supplierName: z.string().trim().min(1, "Supplier name is required").max(200),
  displayName: z.string().trim().max(200).optional().or(z.literal("")),
  supplierTypeId: optionalId(),
  isActive: z.boolean(),
  contactPerson: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().max(200).email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(255).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
  countryId: optionalId(),
  cityId: optionalId(),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  taxRegistrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  currencyId: optionalId(),
  paymentTerms: z.string().optional().or(z.literal("")),
  creditLimit: optionalNumber(),
  bankName: z.string().trim().max(150).optional().or(z.literal("")),
  accountHolderName: z.string().trim().max(150).optional().or(z.literal("")),
  accountNumber: z.string().trim().max(50).optional().or(z.literal("")),
  swiftCode: z.string().trim().max(20).optional().or(z.literal("")),
  rating: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(5).nullable()
  ),
  remarks: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  supplierCode: "",
  supplierName: "",
  displayName: "",
  supplierTypeId: null,
  isActive: true,
  contactPerson: "",
  email: "",
  phone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  countryId: null,
  cityId: null,
  state: "",
  postalCode: "",
  registrationNumber: "",
  taxRegistrationNumber: "",
  currencyId: null,
  paymentTerms: "",
  creditLimit: null,
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  swiftCode: "",
  rating: null,
  remarks: "",
};

/** Create Supplier — UI preview for review. Not yet wired to persistence. */
export function SupplierCreateForm() {
  const { role } = useParams<{ role: string }>();
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeMaster[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    mode: "onBlur",
    defaultValues: emptyValues,
  });

  const countryId = useWatch({ control, name: "countryId" });
  const nameWatch = useWatch({ control, name: "supplierName" });
  const displayWatch = useWatch({ control, name: "displayName" });
  const typeIdWatch = useWatch({ control, name: "supplierTypeId" });
  const emailWatch = useWatch({ control, name: "email" });
  const phoneWatch = useWatch({ control, name: "phone" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [typeRows, countryRows, currencyRows] = await Promise.all([
          listSupplierTypes({ activeOnly: true }),
          listCountries({ activeOnly: true }),
          listCurrencies({ activeOnly: true }),
        ]);
        if (cancelled) return;
        setSupplierTypes(typeRows);
        setCountries(countryRows);
        setCurrencies(currencyRows);
      } catch {
        if (!cancelled) toast.error("Failed to load reference data");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        const current = getValues("cityId");
        if (current && !rows.some((c) => c.cityKey === current)) {
          setValue("cityId", null, { shouldValidate: false });
        }
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  const previewTitle = useMemo(
    () => displayWatch?.trim() || nameWatch?.trim() || "New supplier",
    [displayWatch, nameWatch]
  );
  const previewType = useMemo(
    () => supplierTypes.find((t) => t.typeKey === typeIdWatch)?.name,
    [supplierTypes, typeIdWatch]
  );

  function onSubmit(values: FormValues) {
    toast.success("Preview only — supplier creation isn't connected to the database yet.", {
      description: `Captured "${values.supplierName}" for review — nothing was saved.`,
    });
  }

  if (bootLoading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing supplier form…
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Preview only — this form is for field review. Submitting won&apos;t create a real supplier yet.
        </div>

        <Section icon={Store} title="Identity" description="Core supplier identifiers and classification.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplierCode">Supplier code</Label>
              <Input id="supplierCode" className="h-10" placeholder="Auto-generated if left blank" {...register("supplierCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierName" required>
                Supplier name
              </Label>
              <Input id="supplierName" className="h-10" aria-invalid={!!errors.supplierName} {...register("supplierName")} />
              {errors.supplierName && <p className="text-sm text-destructive">{errors.supplierName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display / trade name</Label>
              <Input id="displayName" className="h-10" {...register("displayName")} />
            </div>
            <div className="space-y-2">
              <Label required>Supplier type</Label>
              <Controller
                control={control}
                name="supplierTypeId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.supplierTypeId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select type";
                          return supplierTypes.find((t) => String(t.typeKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.typeKey)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierTypeId && (
                <p className="text-sm text-destructive">Select a supplier type</p>
              )}
            </div>
          </div>
        </Section>

        <Section icon={Contact} title="Contact" description="Primary point of contact for this supplier.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" className="h-10" {...register("contactPerson")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" className="h-10" aria-invalid={!!errors.email} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" className="h-10" placeholder="+974 XXXX XXXX" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" className="h-10" placeholder="https://" {...register("website")} />
            </div>
          </div>
        </Section>

        <Section icon={MapPin} title="Address" description="Registered or operating address for this supplier.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input id="addressLine1" className="h-10" {...register("addressLine1")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input id="addressLine2" className="h-10" {...register("addressLine2")} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Controller
                control={control}
                name="countryId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) => {
                      field.onChange(v === NONE ? null : Number(v));
                      setValue("cityId", null, { shouldValidate: false });
                    }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value || value === NONE) return "Select country";
                          return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.countryKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    disabled={!countryId || citiesLoading}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value || value === NONE) return citiesLoading ? "Loading…" : "Optional";
                          return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={String(c.cityKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / province</Label>
              <Input id="state" className="h-10" {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" className="h-10" {...register("postalCode")} />
            </div>
          </div>
        </Section>

        <Section icon={Landmark} title="Business & financial" description="Registration, tax, and commercial terms.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Trade license / registration no.</Label>
              <Input id="registrationNumber" className="h-10" {...register("registrationNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRegistrationNumber">Tax registration no. (TRN/VAT)</Label>
              <Input id="taxRegistrationNumber" className="h-10" {...register("taxRegistrationNumber")} />
            </div>
            <div className="space-y-2">
              <Label>Preferred currency</Label>
              <Controller
                control={control}
                name="currencyId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value || value === NONE) return "Select currency";
                          return currencies.find((c) => String(c.currencyKey) === value)?.code ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={String(c.currencyKey)}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment terms</Label>
              <Controller
                control={control}
                name="paymentTerms"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>{(value: string | null) => (!value || value === NONE ? "Select terms" : value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit limit</Label>
              <Input id="creditLimit" type="number" step="0.01" min={0} className="h-10" {...register("creditLimit")} />
            </div>
          </div>
        </Section>

        <Section icon={Banknote} title="Banking details" description="Used for supplier payouts. Optional.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" className="h-10" {...register("bankName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account holder name</Label>
              <Input id="accountHolderName" className="h-10" {...register("accountHolderName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number / IBAN</Label>
              <Input id="accountNumber" className="h-10" {...register("accountNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swiftCode">SWIFT / BIC code</Label>
              <Input id="swiftCode" className="h-10" {...register("swiftCode")} />
            </div>
          </div>
        </Section>

        <Section icon={Star} title="Additional" description="Quality rating and internal remarks.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0–5)</Label>
              <Input id="rating" type="number" step="0.1" min={0} max={5} className="h-10" {...register("rating")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" rows={3} {...register("remarks")} />
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Create supplier
          </Button>
          <Button type="button" variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/supplier`} />}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-28 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{previewTitle}</p>
              <p className="truncate text-sm text-white/75">{previewType ?? "Select a supplier type"}</p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            {previewType && (
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{previewType}</Badge>
              </div>
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              {emailWatch && <p>{emailWatch}</p>}
              {phoneWatch && <p>{phoneWatch}</p>}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Standard fields for onboarding a new supplier — hoteliers, DMCs, transport, and activity providers.</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
