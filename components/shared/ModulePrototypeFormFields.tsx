"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PrototypeFieldDef, PrototypeFormSchema } from "@/mock/data/modulePrototypeForms";
import { cn } from "@/lib/utils";

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: PrototypeFieldDef;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.key}
        value={value}
        disabled={disabled}
        placeholder={field.placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select
        id={field.key}
        className={nativeSelectClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      id={field.key}
      type={
        field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "email"
              ? "email"
              : field.type === "tel"
                ? "tel"
                : "text"
      }
      value={value}
      disabled={disabled}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ModulePrototypeFormFields({
  schema,
  values,
  readOnly,
  onChange,
}: {
  schema: PrototypeFormSchema;
  values: Record<string, string>;
  readOnly: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{section.title}</h3>
            {section.description && (
              <p className="text-xs text-muted-foreground">{section.description}</p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div
                key={field.key}
                className={cn("space-y-1.5", field.span === 2 && "sm:col-span-2")}
              >
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <FieldControl
                  field={field}
                  value={values[field.key] ?? ""}
                  disabled={readOnly}
                  onChange={(v) => onChange(field.key, v)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
