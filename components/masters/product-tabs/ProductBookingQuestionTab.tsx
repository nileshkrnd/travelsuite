"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, HelpCircle, Pencil, Trash2, X, Search, Loader2, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import {
  listBookingQuestionTypes,
  listBookingQuestionRequirements,
  listBookingQuestionOperators,
  BookingQuestionLookupsApiError,
} from "@/lib/services/booking-question-lookups.service";
import {
  listServiceProductBookingQuestions,
  createServiceProductBookingQuestion,
  updateServiceProductBookingQuestion,
  deleteServiceProductBookingQuestion,
  ServiceProductBookingQuestionsApiError,
} from "@/lib/services/service-product-booking-questions.service";
import { can } from "@/config/permissions";
import type {
  BookingQuestionOperator,
  BookingQuestionRequirement,
  BookingQuestionType,
  RoleDef,
  ServiceProduct,
  ServiceProductBookingQuestion,
  ServiceProductOption,
  ServiceProductVariant,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
const NONE = "none";
const SELECT_TYPES = new Set(["SINGLE_SELECT", "MULTI_SELECT"]);

const optionSchema = z.object({
  optionCode: z.string().trim().min(1, "Option code is required").max(50),
  optionName: z.string().trim().min(1, "Option name is required").max(250),
});
const ruleSchema = z.object({
  parentQuestionId: z.number().int().positive("Choose a question"),
  parentQuestionOptionId: z.number().int().positive().nullable(),
  bookingQuestionOperatorId: z.number().int().positive("Choose an operator"),
  comparisonValue: z.string().trim().max(500),
});
const schema = z.object({
  serviceProductOptionId: z.number().int().positive().nullable(),
  serviceProductVariantId: z.number().int().positive().nullable(),
  questionCode: z.string().trim().min(1, "Question code is required").max(50),
  questionText: z.string().trim().min(1, "Question text is required").max(1000),
  bookingQuestionTypeId: z.number().int().positive("Choose a question type"),
  bookingQuestionRequirementId: z.number().int().positive("Choose a requirement"),
  maxLength: z.string().trim(),
  isActive: z.boolean(),
  options: z.array(optionSchema),
  rules: z.array(ruleSchema),
});

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    questionCode: "",
    questionText: "",
    bookingQuestionTypeId: 0,
    bookingQuestionRequirementId: 0,
    maxLength: "",
    isActive: true,
    options: [],
    rules: [],
  };
}

function QuestionPanel({
  mode,
  row,
  rows,
  options,
  questionTypes,
  requirements,
  operators,
  userKey,
  serviceProductId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductBookingQuestion;
  rows: ServiceProductBookingQuestion[];
  options: ServiceProductOption[];
  questionTypes: BookingQuestionType[];
  requirements: BookingQuestionRequirement[];
  operators: BookingQuestionOperator[];
  userKey: number;
  serviceProductId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: row
      ? {
          serviceProductOptionId: row.serviceProductOptionId,
          serviceProductVariantId: row.serviceProductVariantId,
          questionCode: row.questionCode,
          questionText: row.questionText,
          bookingQuestionTypeId: row.bookingQuestionTypeId,
          bookingQuestionRequirementId: row.bookingQuestionRequirementId,
          maxLength: row.maxLength != null ? String(row.maxLength) : "",
          isActive: row.isActive,
          options: row.options.map((o) => ({ optionCode: o.optionCode, optionName: o.optionName })),
          rules: row.rules.map((r) => ({
            parentQuestionId: r.parentQuestionId,
            parentQuestionOptionId: r.parentQuestionOptionId,
            bookingQuestionOperatorId: r.bookingQuestionOperatorId,
            comparisonValue: r.comparisonValue ?? "",
          })),
        }
      : blankValues(),
  });

  const optionsArray = useFieldArray({ control, name: "options" });
  const rulesArray = useFieldArray({ control, name: "rules" });
  const selectedOptionId = watch("serviceProductOptionId");
  const selectedTypeId = watch("bookingQuestionTypeId");
  const selectedType = questionTypes.find((t) => t.bookingQuestionTypeId === selectedTypeId);
  const isSelectType = selectedType ? SELECT_TYPES.has(selectedType.questionTypeCode.toUpperCase()) : false;
  const watchedRules = watch("rules");

  const otherQuestions = rows.filter((q) => q.serviceProductBookingQuestionId !== row?.serviceProductBookingQuestionId);

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      questionCode: values.questionCode.trim(),
      questionText: values.questionText.trim(),
      bookingQuestionTypeId: values.bookingQuestionTypeId,
      bookingQuestionRequirementId: values.bookingQuestionRequirementId,
      maxLength: values.maxLength.trim() !== "" ? Number(values.maxLength) : null,
      isActive: values.isActive,
      options: isSelectType ? values.options : [],
      rules: values.rules.map((r) => ({
        parentQuestionId: r.parentQuestionId,
        parentQuestionOptionId: r.parentQuestionOptionId,
        bookingQuestionOperatorId: r.bookingQuestionOperatorId,
        comparisonValue: r.comparisonValue.trim() || null,
      })),
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductBookingQuestion(row.serviceProductBookingQuestionId, { ...payload, serviceProductId, modifiedBy: userKey });
        toast.success("Booking question updated");
      } else if (mode === "create") {
        await createServiceProductBookingQuestion({ ...payload, serviceProductId, createdBy: userKey });
        toast.success("Booking question created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductBookingQuestionsApiError ? error.message : "Could not save booking question");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add booking question" : mode === "edit" ? "Edit booking question" : "Booking question details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="questionCode" required>
              Question code
            </Label>
            <Input id="questionCode" disabled={isReadOnly} aria-invalid={!!errors.questionCode} {...register("questionCode")} />
            {errors.questionCode && <p className="text-sm text-destructive">{errors.questionCode.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="questionText" required>
              Question text
            </Label>
            <Input id="questionText" disabled={isReadOnly} aria-invalid={!!errors.questionText} {...register("questionText")} />
            {errors.questionText && <p className="text-sm text-destructive">{errors.questionText.message}</p>}
          </div>

          <div className="space-y-1">
            <Label required>Answer type</Label>
            <Controller
              control={control}
              name="bookingQuestionTypeId"
              render={({ field }) => (
                <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue placeholder="Select type">
                      {(value: string | null) => questionTypes.find((t) => String(t.bookingQuestionTypeId) === value)?.questionTypeName ?? "Select type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((t) => (
                      <SelectItem key={t.bookingQuestionTypeId} value={String(t.bookingQuestionTypeId)}>
                        {t.questionTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bookingQuestionTypeId && <p className="text-sm text-destructive">{errors.bookingQuestionTypeId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label required>Requirement</Label>
            <Controller
              control={control}
              name="bookingQuestionRequirementId"
              render={({ field }) => (
                <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue placeholder="Select">
                      {(value: string | null) => requirements.find((r) => String(r.bookingQuestionRequirementId) === value)?.requirementName ?? "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((r) => (
                      <SelectItem key={r.bookingQuestionRequirementId} value={String(r.bookingQuestionRequirementId)}>
                        {r.requirementName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bookingQuestionRequirementId && <p className="text-sm text-destructive">{errors.bookingQuestionRequirementId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxLength">Max length</Label>
            <Input id="maxLength" type="number" min={1} disabled={isReadOnly} {...register("maxLength")} />
          </div>

          <div className="space-y-1">
            <Label>Option scope</Label>
            <Controller
              control={control}
              name="serviceProductOptionId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => {
                    field.onChange(!v || v === NONE ? null : Number(v));
                    setValue("serviceProductVariantId", null);
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "Whole product";
                        return options.find((o) => String(o.serviceProductOptionId) === value)?.optionName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Whole product</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                        {o.optionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>Variant scope</Label>
            <Controller
              control={control}
              name="serviceProductVariantId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly || !selectedOptionId}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "All variants";
                        return variants.find((v) => String(v.serviceProductVariantId) === value)?.variantName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All variants</SelectItem>
                    {variants.map((v) => (
                      <SelectItem key={v.serviceProductVariantId} value={String(v.serviceProductVariantId)}>
                        {v.variantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-end gap-4 pb-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                  Active
                </label>
              )}
            />
          </div>
        </div>

        {isSelectType && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <h3 className="text-sm font-medium">Answer options</h3>
            {optionsArray.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No options yet.</p>
            ) : (
              optionsArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input {...register(`options.${index}.optionCode`)} disabled={isReadOnly} placeholder="Code" className="w-32 font-mono" />
                  <Input {...register(`options.${index}.optionName`)} disabled={isReadOnly} placeholder="Label" />
                  {!isReadOnly && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => optionsArray.remove(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
            {!isReadOnly && (
              <Button type="button" variant="outline" size="sm" onClick={() => optionsArray.append({ optionCode: "", optionName: "" })}>
                <Plus className="h-4 w-4" />
                Add option
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <h3 className="text-sm font-medium">Conditional visibility rules</h3>
            <p className="text-xs text-muted-foreground">Show this question only when another question's answer matches.</p>
          </div>
          {rulesArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Always shown — no conditional rules.</p>
          ) : (
            rulesArray.fields.map((field, index) => {
              const parentId = watchedRules[index]?.parentQuestionId ?? 0;
              const parentQuestion = otherQuestions.find((q) => q.serviceProductBookingQuestionId === parentId);
              return (
                <div key={field.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">Parent question</Label>
                    <Controller
                      control={control}
                      name={`rules.${index}.parentQuestionId`}
                      render={({ field: f }) => (
                        <Select value={f.value > 0 ? String(f.value) : ""} onValueChange={(v) => f.onChange(Number(v))} disabled={isReadOnly}>
                          <SelectTrigger className="h-10 w-full min-w-0">
                            <SelectValue placeholder="Select question">
                              {(value: string | null) => otherQuestions.find((q) => String(q.serviceProductBookingQuestionId) === value)?.questionText ?? "Select question"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {otherQuestions.map((q) => (
                              <SelectItem key={q.serviceProductBookingQuestionId} value={String(q.serviceProductBookingQuestionId)}>
                                {q.questionText}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Controller
                      control={control}
                      name={`rules.${index}.bookingQuestionOperatorId`}
                      render={({ field: f }) => (
                        <Select value={f.value > 0 ? String(f.value) : ""} onValueChange={(v) => f.onChange(Number(v))} disabled={isReadOnly}>
                          <SelectTrigger className="h-10 w-full min-w-0">
                            <SelectValue placeholder="Operator">
                              {(value: string | null) => operators.find((o) => String(o.bookingQuestionOperatorId) === value)?.operatorName ?? "Operator"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((o) => (
                              <SelectItem key={o.bookingQuestionOperatorId} value={String(o.bookingQuestionOperatorId)}>
                                {o.operatorName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {parentQuestion && parentQuestion.options.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Parent's option</Label>
                      <Controller
                        control={control}
                        name={`rules.${index}.parentQuestionOptionId`}
                        render={({ field: f }) => (
                          <Select value={f.value ? String(f.value) : NONE} onValueChange={(v) => f.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                            <SelectTrigger className="h-10 w-full min-w-0">
                              <SelectValue>
                                {(value: string | null) => {
                                  if (!value || value === NONE) return "Use value below";
                                  return parentQuestion.options.find((o) => String(o.serviceProductBookingQuestionOptionId) === value)?.optionName ?? value;
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Use value below</SelectItem>
                              {parentQuestion.options.map((o) => (
                                <SelectItem key={o.serviceProductBookingQuestionOptionId} value={String(o.serviceProductBookingQuestionOptionId)}>
                                  {o.optionName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Comparison value</Label>
                      <Input {...register(`rules.${index}.comparisonValue`)} disabled={isReadOnly} placeholder="e.g. YES" />
                    </div>
                  )}
                  {!isReadOnly && (
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => rulesArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        Remove rule
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rulesArray.append({ parentQuestionId: otherQuestions[0]?.serviceProductBookingQuestionId ?? 0, parentQuestionOptionId: null, bookingQuestionOperatorId: operators[0]?.bookingQuestionOperatorId ?? 0, comparisonValue: "" })}
              disabled={otherQuestions.length === 0 || operators.length === 0}
            >
              <GitBranch className="h-4 w-4" />
              Add rule
            </Button>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function ProductBookingQuestionTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [questionTypes, setQuestionTypes] = useState<BookingQuestionType[]>([]);
  const [requirements, setRequirements] = useState<BookingQuestionRequirement[]>([]);
  const [operators, setOperators] = useState<BookingQuestionOperator[]>([]);
  const [rows, setRows] = useState<ServiceProductBookingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductBookingQuestion | undefined>();
  const [search, setSearch] = useState("");

  const canEdit = can(roleDef, "serviceProductBookingQuestion", "edit");
  const canCreate = can(roleDef, "serviceProductBookingQuestion", "create");
  const canDelete = can(roleDef, "serviceProductBookingQuestion", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    listServiceProductOptions({ serviceProductId: product.serviceProductId }).then(setOptions);
    Promise.all([
      listBookingQuestionTypes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }),
      listBookingQuestionRequirements({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }),
      listBookingQuestionOperators({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }),
    ])
      .then(([typeRows, reqRows, opRows]) => {
        setQuestionTypes(typeRows);
        setRequirements(reqRows);
        setOperators(opRows);
      })
      .catch((error) => {
        toast.error(error instanceof BookingQuestionLookupsApiError ? error.message : "Failed to load booking question lookups");
      });
  }, [product.serviceProductId, product.tenantId, product.companyId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductBookingQuestions({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductBookingQuestionsApiError ? error.message : "Failed to load booking questions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.serviceProductId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.questionText.toLowerCase().includes(term) || r.questionCode.toLowerCase().includes(term));
  }, [rows, search]);

  async function removeRow(row: ServiceProductBookingQuestion) {
    try {
      await deleteServiceProductBookingQuestion(row.serviceProductBookingQuestionId);
      await refreshRows();
      toast.success("Booking question deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductBookingQuestionsApiError ? error.message : "Could not delete booking question");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Booking Questions"
        description="Dynamic questions asked at booking time — with optional conditional visibility rules between questions."
        actions={
          canCreate && panelMode === "closed" && questionTypes.length > 0 && requirements.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add question
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <QuestionPanel
          mode={panelMode}
          row={target}
          rows={rows}
          options={options}
          questionTypes={questionTypes}
          requirements={requirements}
          operators={operators}
          userKey={userKey}
          serviceProductId={product.serviceProductId}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search question…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading booking questions…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={HelpCircle} tone="primary" heading="No booking questions yet" description="Add a question travelers answer at booking time." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching questions" description="Try a different search." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32%] px-2 py-1.5">Question</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Requirement</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Rules</TableHead>
                <TableHead className="w-[26%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductBookingQuestionId}>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.questionText}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.questionTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.requirementCode === "MANDATORY" ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.requirementName ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.rules.length > 0 ? row.rules.length : "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                          <Search className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                            <Pencil className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
