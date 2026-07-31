"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Home, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ModulePrototypeFormFields } from "@/components/shared/ModulePrototypeFormFields";
import {
  getPrototypeFormSchema,
  sampleValuesFromSchema,
} from "@/mock/data/modulePrototypeForms";
import type { ModuleKey } from "@/config/permissions";
import type { PrototypeFormMode } from "@/components/shared/ModulePrototypeFormDialog";

export function ModulePrototypeFormPage({
  moduleKey,
  title,
  groupLabel,
  listPath,
  mode,
  recordId,
}: {
  moduleKey: ModuleKey;
  title: string;
  groupLabel?: string;
  /** Menu leaf path without role prefix, e.g. inventory/masters/warehouse */
  listPath: string;
  mode: PrototypeFormMode;
  recordId?: string;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const schema = useMemo(() => getPrototypeFormSchema(moduleKey), [moduleKey]);
  const [values, setValues] = useState<Record<string, string>>({});

  const listHref = `/${role}/${listPath}`;
  const editHref = recordId ? `/${role}/${listPath}/${recordId}/edit` : listHref;

  useEffect(() => {
    if (!schema) return;
    if (mode === "create") {
      const empty: Record<string, string> = {};
      for (const section of schema.sections) {
        for (const f of section.fields) empty[f.key] = "";
      }
      setValues(empty);
    } else {
      setValues(sampleValuesFromSchema(schema));
    }
  }, [schema, mode, recordId]);

  if (!schema) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={title} description="No form schema is configured for this module yet." />
        <Button variant="outline" nativeButton={false} render={<Link href={listHref} />}>
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Button>
      </div>
    );
  }

  const readOnly = mode === "view";
  const modeLabel = mode === "create" ? "New" : mode === "edit" ? "Edit" : "View";

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSave() {
    toast.success(mode === "create" ? `${title} saved` : `${title} updated`);
    router.push(listHref);
  }

  return (
    <div className="space-y-6 p-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link
          href={`/${role}/dashboard`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <span aria-hidden>/</span>
        <span>{groupLabel ?? "Modules"}</span>
        <span aria-hidden>/</span>
        <Link href={listHref} className="hover:text-foreground">
          {title}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{modeLabel}</span>
      </nav>

      <PageHeader
        title={`${modeLabel} ${title}`}
        description={`Enter ${title.toLowerCase()} details.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={listHref} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {mode === "view" && (
              <Button size="sm" nativeButton={false} render={<Link href={editHref} />}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base font-semibold">{title} details</CardTitle>
        </CardHeader>
        <CardContent>
          <ModulePrototypeFormFields
            schema={schema}
            values={values}
            readOnly={readOnly}
            onChange={setField}
          />
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="outline" nativeButton={false} render={<Link href={listHref} />}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="button" onClick={onSave}>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Save" : "Save changes"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
