"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModulePrototypeFormFields } from "@/components/shared/ModulePrototypeFormFields";
import {
  getPrototypeFormSchema,
  sampleValuesFromSchema,
} from "@/mock/data/modulePrototypeForms";
import type { ModuleKey } from "@/config/permissions";

export type PrototypeFormMode = "create" | "view" | "edit";

export function ModulePrototypeFormDialog({
  moduleKey,
  title,
  open,
  mode,
  onOpenChange,
}: {
  moduleKey: ModuleKey;
  title: string;
  open: boolean;
  mode: PrototypeFormMode;
  onOpenChange: (open: boolean) => void;
}) {
  const schema = useMemo(() => getPrototypeFormSchema(moduleKey), [moduleKey]);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !schema) return;
    if (mode === "create") {
      const empty: Record<string, string> = {};
      for (const section of schema.sections) {
        for (const f of section.fields) empty[f.key] = "";
      }
      setValues(empty);
    } else {
      setValues(sampleValuesFromSchema(schema));
    }
  }, [open, mode, schema]);

  if (!schema) return null;

  const readOnly = mode === "view";
  const modeLabel = mode === "create" ? "New" : mode === "edit" ? "Edit" : "View";

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSave() {
    toast.success(mode === "create" ? `${title} saved` : `${title} updated`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {modeLabel} {title}
          </DialogTitle>
          <DialogDescription>Enter {title.toLowerCase()} details.</DialogDescription>
        </DialogHeader>

        <ModulePrototypeFormFields
          schema={schema}
          values={values}
          readOnly={readOnly}
          onChange={setField}
        />

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {readOnly ? "Close" : "Cancel"}
          </DialogClose>
          {!readOnly && (
            <Button type="button" onClick={onSave}>
              {mode === "create" ? "Save" : "Save changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function hasPrototypeForm(moduleKey: ModuleKey): boolean {
  return getPrototypeFormSchema(moduleKey) != null;
}

export type { PrototypeFormSchema } from "@/mock/data/modulePrototypeForms";
