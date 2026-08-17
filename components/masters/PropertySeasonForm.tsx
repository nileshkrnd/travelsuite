"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarRange, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { getProperty, PropertiesApiError } from "@/lib/services/properties.service";
import {
  listPropertySeasons,
  createPropertySeason,
  updatePropertySeason,
  PropertySeasonsApiError,
} from "@/lib/services/property-seasons.service";
import type { Property, PropertySeason } from "@/types";

const SEASON_CODE_PRESETS = [
  { code: "LOW", name: "Low Season" },
  { code: "HIGH", name: "High Season" },
  { code: "PEAK", name: "Peak Season" },
] as const;

const rowSchema = z.object({
  seasonCode: z.string().trim().min(1, "Required").max(50),
  seasonName: z.string().trim().min(1, "Required").max(100),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1, "Add at least one season"),
});

type RowValues = z.infer<typeof rowSchema>;
type FormValues = z.infer<typeof schema>;

function blankRow(displayOrder: number, code = "", name = ""): RowValues {
  return { seasonCode: code, seasonName: name, displayOrder, isActive: true };
}

function rowFromEntry(entry: PropertySeason): RowValues {
  return {
    seasonCode: entry.seasonCode,
    seasonName: entry.seasonName,
    displayOrder: entry.displayOrder,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for a property season — spreadsheet-style multi-row entry when creating. */
export function PropertySeasonForm({ entry }: { entry?: PropertySeason }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;
  const scope = useExtranetPropertyScopeStore();

  const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
  const propertyId = entry
    ? entry.propertyId
    : Number.isFinite(urlPropertyId) && urlPropertyId > 0
      ? urlPropertyId
      : (scope.propertyId ?? 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [existingSeasons, setExistingSeasons] = useState<PropertySeason[]>([]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [entry ? rowFromEntry(entry) : blankRow(0)] },
  });

  const rowArray = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  useEffect(() => {
    if (propertyId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProperty(propertyId),
      isEdit
        ? Promise.resolve([] as PropertySeason[])
        : listPropertySeasons({ tenantId: tenantKey, companyId: companyKey, propertyId }),
    ])
      .then(([propertyRow, seasonRows]) => {
        if (cancelled) return;
        setProperty(propertyRow);
        setExistingSeasons(seasonRows);
        if (!isEdit) {
          const nextOrder = seasonRows.reduce((max, s) => Math.max(max, s.displayOrder), -1) + 1;
          setValue("rows.0.displayOrder", nextOrder);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof PropertiesApiError ? err.message : "Failed to load property");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, tenantKey, companyKey, isEdit]);

  const propertyLabel = entry
    ? entry.propertyName || entry.propertyCode || `Property #${entry.propertyId}`
    : property
      ? property.propertyDisplayName || property.propertyName || property.propertyCode
      : scope.propertyId === propertyId
        ? scope.propertyLabel
        : null;

  const existingCodes = useMemo(
    () => new Set(existingSeasons.map((s) => s.seasonCode.toUpperCase())),
    [existingSeasons]
  );

  function addRow(code = "", name = "") {
    const maxOrder = rows.reduce((max, r) => Math.max(max, r.displayOrder ?? 0), -1);
    rowArray.append(blankRow(maxOrder + 1, code, name));
  }

  function addPreset(preset: (typeof SEASON_CODE_PRESETS)[number]) {
    addRow(preset.code, preset.name);
  }

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    if (propertyId <= 0) {
      toast.error("Missing property context.");
      return;
    }

    // Strong duplicate guard: same season code can't repeat within this batch, nor
    // duplicate a season already configured for this property.
    const seenInBatch = new Set<string>();
    const dupCodes: string[] = [];
    for (const row of values.rows) {
      const code = row.seasonCode.trim().toUpperCase();
      if (existingCodes.has(code) || seenInBatch.has(code)) {
        if (!dupCodes.includes(code)) dupCodes.push(code);
      }
      seenInBatch.add(code);
    }
    if (dupCodes.length > 0) {
      toast.error(`Already exists for this property: ${dupCodes.join(", ")}`);
      return;
    }

    setSaving(true);

    if (entry) {
      const row = values.rows[0]!;
      try {
        const saved = await updatePropertySeason(entry.propertySeasonKey, {
          tenantId: tenantKey,
          companyId: companyKey,
          propertyId,
          seasonCode: row.seasonCode.trim().toUpperCase(),
          seasonName: row.seasonName.trim(),
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        toast.success("Season updated");
        router.push(`/${role}/extranet/seasons/${saved.propertySeasonKey}`);
      } catch (error) {
        toast.error(error instanceof PropertySeasonsApiError ? error.message : "Could not save season");
      } finally {
        setSaving(false);
      }
      return;
    }

    let saved = 0;
    const failed: string[] = [];
    for (const row of values.rows) {
      try {
        await createPropertySeason({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyId,
          seasonCode: row.seasonCode.trim().toUpperCase(),
          seasonName: row.seasonName.trim(),
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          createdBy: actorKey,
        });
        saved += 1;
      } catch (err) {
        const message = err instanceof PropertySeasonsApiError ? err.message : "save failed";
        failed.push(`${row.seasonCode.trim().toUpperCase()} (${message})`);
      }
    }
    setSaving(false);

    if (saved > 0) {
      toast.success(`${saved} season${saved === 1 ? "" : "s"} created`);
    }
    if (failed.length > 0) {
      toast.error(`Could not add: ${failed.join(", ")}`);
    } else {
      router.push(`/${role}/extranet/seasons?propertyId=${propertyId}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (propertyId <= 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        tone="muted"
        heading="No property selected"
        description="Select a property first, then add seasons for it."
        action={
          <Button nativeButton={false} render={<Link href={`/${role}/extranet/seasons`} />}>
            Choose a property
          </Button>
        }
      />
    );
  }

  const listHref = `/${role}/extranet/seasons?propertyId=${propertyId}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-full space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Property</p>
        <p className="text-base font-semibold text-foreground">
          {propertyLabel ?? `Property #${propertyId}`}
        </p>
      </div>

      {!isEdit && (
        <div className="flex flex-wrap gap-2">
          {SEASON_CODE_PRESETS.map((preset) => (
            <Button key={preset.code} type="button" size="sm" variant="outline" onClick={() => addPreset(preset)}>
              <Plus className="h-4 w-4" />
              {preset.name}
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[160px]">
                Season code<span className="text-destructive"> *</span>
              </TableHead>
              <TableHead className="min-w-[220px]">
                Season name<span className="text-destructive"> *</span>
              </TableHead>
              <TableHead className="w-32">Display order</TableHead>
              <TableHead className="w-20 text-center">Active</TableHead>
              {!isEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowArray.fields.map((field, index) => {
              const rowErrors = errors.rows?.[index];
              return (
                <TableRow key={field.id}>
                  <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="p-1 align-top">
                    <Input
                      className="h-9 font-mono uppercase"
                      placeholder="LOW / HIGH / PEAK"
                      {...register(`rows.${index}.seasonCode`)}
                    />
                    {rowErrors?.seasonCode && (
                      <p className="mt-1 text-xs text-destructive">{rowErrors.seasonCode.message}</p>
                    )}
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <Input
                      className="h-9"
                      placeholder="Low Season"
                      {...register(`rows.${index}.seasonName`)}
                    />
                    {rowErrors?.seasonName && (
                      <p className="mt-1 text-xs text-destructive">{rowErrors.seasonName.message}</p>
                    )}
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <Input
                      type="number"
                      className="h-9"
                      {...register(`rows.${index}.displayOrder`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="p-1 text-center align-top">
                    <Controller
                      control={control}
                      name={`rows.${index}.isActive`}
                      render={({ field: f }) => (
                        <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                      )}
                    />
                  </TableCell>
                  {!isEdit && (
                    <TableCell className="p-1 text-center align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={rowArray.fields.length <= 1}
                        onClick={() => rowArray.remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!isEdit && (
        <Button type="button" variant="outline" size="sm" onClick={() => addRow()}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : rows.length > 1 ? `Create ${rows.length} seasons` : "Create season"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={isEdit && entry ? `/${role}/extranet/seasons/${entry.propertySeasonKey}` : listHref} />}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
