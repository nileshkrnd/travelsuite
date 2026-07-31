"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  ScrollText,
  MoreHorizontal,
  Search,
  Pencil,
  Eye,
  Trash2,
  CheckCircle2,
  Minus,
} from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Money } from "@/components/shared/Money";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCostCentersStore } from "@/lib/store/cost-centers.store";
import { useFinanceDepartmentsStore } from "@/lib/store/finance-departments.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useVouchersStore } from "@/lib/store/vouchers.store";
import { can } from "@/config/permissions";
import {
  VOUCHER_KIND_CONFIGS,
  VOUCHER_STATUSES,
  voucherStatusLabel,
  type CurrencyCode,
  type RoleDef,
  type Voucher,
  type VoucherStatus,
} from "@/types";
import { cn } from "@/lib/utils";

const KIND = "journal" as const;
const config = VOUCHER_KIND_CONFIGS[KIND];

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

type SortKey = "date" | "voucherNo" | "amount";
type DialogMode = "create" | "edit" | "view";

const lineSchema = z.object({
  ledgerId: z.string().min(1, "Ledger required"),
  debit: z.string().trim(),
  credit: z.string().trim(),
  narration: z.string().trim().max(200),
});

const schema = z
  .object({
    date: z.string().min(1, "Date is required"),
    voucherNo: z.string().trim().max(30),
    costCenterId: z.string(),
    departmentId: z.string(),
    referenceNo: z.string().trim().max(60),
    narration: z.string().trim().max(300),
    status: z
      .string()
      .refine((v): v is VoucherStatus => VOUCHER_STATUSES.some((s) => s.value === v), {
        message: "Status is required",
      }),
    lines: z.array(lineSchema).min(2, "At least two lines are required"),
  })
  .superRefine((values, ctx) => {
    let totalDr = 0;
    let totalCr = 0;
    values.lines.forEach((ln, i) => {
      const dr = Number(ln.debit || 0);
      const cr = Number(ln.credit || 0);
      if (Number.isNaN(dr) || dr < 0 || Number.isNaN(cr) || cr < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter valid amounts",
          path: ["lines", i, "debit"],
        });
        return;
      }
      if (dr > 0 && cr > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Use either debit or credit, not both",
          path: ["lines", i, "debit"],
        });
      }
      if (dr === 0 && cr === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a debit or credit",
          path: ["lines", i, "debit"],
        });
      }
      totalDr += dr;
      totalCr += cr;
    });
    if (Math.abs(totalDr - totalCr) > 0.005) {
      ctx.addIssue({
        code: "custom",
        message: `Entry out of balance (Dr ${totalDr.toFixed(2)} ≠ Cr ${totalCr.toFixed(2)})`,
        path: ["lines"],
      });
    }
    if (totalDr <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Total must be greater than zero",
        path: ["lines"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function emptyLine(): FormValues["lines"][number] {
  return { ledgerId: "", debit: "", credit: "", narration: "" };
}

function emptyFormValues(): FormValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    voucherNo: "",
    costCenterId: "",
    departmentId: "",
    referenceNo: "",
    narration: "",
    status: "draft",
    lines: [emptyLine(), emptyLine()],
  };
}

function formValuesFromVoucher(v: Voucher): FormValues {
  return {
    date: v.date,
    voucherNo: v.voucherNo,
    costCenterId: v.costCenterId ?? "",
    departmentId: v.departmentId ?? "",
    referenceNo: v.referenceNo,
    narration: v.narration,
    status: v.status,
    lines: v.lines.map((ln) => ({
      ledgerId: ln.ledgerId,
      debit: ln.debit ? String(ln.debit) : "",
      credit: ln.credit ? String(ln.credit) : "",
      narration: ln.narration,
    })),
  };
}

function moneyOf(value: number, currencyCode: CurrencyCode) {
  return { value: Math.round(value), currencyCode };
}

function statusVariant(status: VoucherStatus): "default" | "secondary" | "outline" | "destructive" {
  if (status === "posted") return "default";
  if (status === "cancelled") return "destructive";
  return "outline";
}

function JournalList({ roleDef }: { roleDef: RoleDef }) {
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const allLedgers = useLedgersStore((s) => s.ledgers);
  const allCostCenters = useCostCentersStore((s) => s.costCenters);
  const allDepartments = useFinanceDepartmentsStore((s) => s.departments);
  const vouchers = useVouchersStore((s) => s.vouchers);
  const addVoucher = useVouchersStore((s) => s.addVoucher);
  const updateVoucher = useVouchersStore((s) => s.updateVoucher);
  const setVoucherStatus = useVouchersStore((s) => s.setVoucherStatus);
  const deleteVoucher = useVouchersStore((s) => s.deleteVoucher);

  const currency = (tenant.defaultCurrency ?? "AED") as CurrencyCode;
  const canCreate = can(roleDef, config.module, "create");
  const canEdit = can(roleDef, config.module, "edit");
  const canDelete = can(roleDef, config.module, "delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<Voucher | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: emptyFormValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const lineTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const ln of watchedLines ?? []) {
      debit += Number(ln?.debit || 0) || 0;
      credit += Number(ln?.credit || 0) || 0;
    }
    return { debit, credit, diff: Math.round((debit - credit) * 100) / 100 };
  }, [watchedLines]);

  const ledgerOptions = useMemo(
    () =>
      allLedgers
        .filter((l) => l.tenantId === tenantId && l.status === "active")
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code)),
    [allLedgers, tenantId]
  );

  const costCenterOptions = useMemo(
    () =>
      allCostCenters
        .filter((c) => c.tenantId === tenantId && c.status === "active")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allCostCenters, tenantId]
  );

  const departmentOptions = useMemo(
    () =>
      allDepartments
        .filter((d) => d.tenantId === tenantId && d.status === "active")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allDepartments, tenantId]
  );

  const ledgerName = useMemo(() => {
    const map = new Map(allLedgers.map((l) => [l.id, l.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [allLedgers]);

  const costCenterName = useMemo(() => {
    const map = new Map(allCostCenters.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [allCostCenters]);

  const departmentName = useMemo(() => {
    const map = new Map(allDepartments.map((d) => [d.id, d.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [allDepartments]);

  useEffect(() => {
    document.title = `${config.title} · ${SAAS_BRAND.name}`;
  }, []);

  const rows = useMemo(() => {
    let list = vouchers.filter((v) => v.tenantId === tenantId && v.kind === KIND);
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.voucherNo.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q) ||
          costCenterName(v.costCenterId).toLowerCase().includes(q) ||
          departmentName(v.departmentId).toLowerCase().includes(q) ||
          v.lines.some((ln) => ledgerName(ln.ledgerId).toLowerCase().includes(q))
      );
    }
    list = list.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "voucherNo") cmp = a.voucherNo.localeCompare(b.voucherNo);
      else cmp = a.amount - b.amount;
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    vouchers,
    tenantId,
    statusFilter,
    search,
    sortKey,
    sortDirection,
    costCenterName,
    departmentName,
    ledgerName,
  ]);

  function openCreate() {
    setSelected(undefined);
    setDialogMode("create");
    form.reset(emptyFormValues());
    setDialogOpen(true);
  }

  function openEdit(v: Voucher) {
    setSelected(v);
    setDialogMode("edit");
    form.reset(formValuesFromVoucher(v));
    setDialogOpen(true);
  }

  function openView(v: Voucher) {
    setSelected(v);
    setDialogMode("view");
    form.reset(formValuesFromVoucher(v));
    setDialogOpen(true);
  }

  function onSort(key: SortKey) {
    if (sortKey === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    }
  }

  function onSubmit(values: FormValues) {
    const lines = values.lines.map((ln, i) => ({
      id: `ln_${i + 1}`,
      ledgerId: ln.ledgerId,
      debit: Number(ln.debit || 0),
      credit: Number(ln.credit || 0),
      narration: ln.narration,
    }));
    const amount = lines.reduce((s, ln) => s + ln.debit, 0);
    const payload = {
      kind: KIND,
      date: values.date,
      partyLedgerId: null,
      accountLedgerId: null,
      costCenterId: values.costCenterId || null,
      departmentId: values.departmentId || null,
      amount,
      narration: values.narration,
      referenceNo: values.referenceNo,
      status: values.status,
      voucherNo: values.voucherNo || undefined,
      lines,
    };
    if (dialogMode === "edit" && selected) {
      updateVoucher(selected.id, payload);
      toast.success(`${config.title} updated`);
    } else {
      const created = addVoucher(payload);
      toast.success(`${created.voucherNo} saved`);
    }
    setDialogOpen(false);
  }

  const readOnly = dialogMode === "view";
  const postedTotal = rows.filter((v) => v.status === "posted").reduce((s, v) => s + v.amount, 0);
  const linesError =
    typeof form.formState.errors.lines?.message === "string"
      ? form.formState.errors.lines.message
      : form.formState.errors.lines?.root?.message;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New journal
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Entries</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Posted total</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            <Money money={moneyOf(postedTotal, currency)} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Drafts</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {rows.filter((v) => v.status === "draft").length}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search voucher, ledger, narration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className={`${nativeSelectClass} sm:w-40`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {VOUCHER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground sm:ms-auto">
          {rows.length} voucher{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            tone="muted"
            heading="No journal vouchers yet"
            description="Create a multi-line journal entry with balancing debit and credit lines."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Create journal
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="date"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Date
                </SortableTableHead>
                <SortableTableHead
                  sortKey="voucherNo"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Voucher
                </SortableTableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="hidden md:table-cell">Cost centre</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Lines</TableHead>
                <SortableTableHead
                  sortKey="amount"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                  className="text-right"
                >
                  Amount
                </SortableTableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(v.date + "T12:00:00").toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">{v.voucherNo}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{v.narration || "—"}</TableCell>
                  <TableCell className="hidden max-w-[120px] truncate text-muted-foreground md:table-cell">
                    {costCenterName(v.costCenterId)}
                  </TableCell>
                  <TableCell className="hidden max-w-[120px] truncate text-muted-foreground lg:table-cell">
                    {departmentName(v.departmentId)}
                  </TableCell>
                  <TableCell className="hidden text-center tabular-nums sm:table-cell">
                    {v.lines.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Money money={moneyOf(v.amount, currency)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(v.status)}>{voucherStatusLabel(v.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(v)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && v.status !== "cancelled" && (
                          <DropdownMenuItem onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && v.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setVoucherStatus(v.id, "posted");
                              toast.success(`${v.voucherNo} posted`);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Post
                          </DropdownMenuItem>
                        )}
                        {canDelete && v.status !== "posted" && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              if (deleteVoucher(v.id)) toast.success("Voucher deleted");
                              else toast.error("Posted vouchers cannot be deleted");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" && "New Journal Voucher"}
              {dialogMode === "edit" && `Edit ${selected?.voucherNo ?? "Journal"}`}
              {dialogMode === "view" && selected?.voucherNo}
            </DialogTitle>
            <DialogDescription>
              Enter balanced debit and credit lines. Totals must match before save.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jv-date">Date</Label>
                <Input id="jv-date" type="date" disabled={readOnly} {...form.register("date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jv-no">Voucher no.</Label>
                <Input
                  id="jv-no"
                  placeholder="Auto on save"
                  disabled={readOnly}
                  {...form.register("voucherNo")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jv-cc">Cost centre</Label>
                <Controller
                  control={form.control}
                  name="costCenterId"
                  render={({ field }) => (
                    <select
                      id="jv-cc"
                      className={nativeSelectClass}
                      disabled={readOnly}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="">None</option>
                      {costCenterOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jv-dept">Department</Label>
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <select
                      id="jv-dept"
                      className={nativeSelectClass}
                      disabled={readOnly}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="">None</option>
                      {departmentOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jv-ref">Reference no.</Label>
                <Input id="jv-ref" disabled={readOnly} {...form.register("referenceNo")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jv-status">Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <select
                      id="jv-status"
                      className={nativeSelectClass}
                      disabled={readOnly}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {VOUCHER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jv-narration">Narration</Label>
              <Input id="jv-narration" disabled={readOnly} {...form.register("narration")} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Entry lines</Label>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
                    <Plus className="h-3.5 w-3.5" />
                    Add line
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Ledger</TableHead>
                      <TableHead className="w-28 text-right">Debit</TableHead>
                      <TableHead className="w-28 text-right">Credit</TableHead>
                      <TableHead className="min-w-[140px]">Line narration</TableHead>
                      {!readOnly && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`lines.${index}.ledgerId`}
                            render={({ field: f }) => (
                              <select
                                className={cn(nativeSelectClass, "h-9")}
                                disabled={readOnly}
                                value={f.value}
                                onChange={f.onChange}
                              >
                                <option value="">Select…</option>
                                {ledgerOptions.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.code} — {l.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-9 text-right"
                            inputMode="decimal"
                            disabled={readOnly}
                            {...form.register(`lines.${index}.debit`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-9 text-right"
                            inputMode="decimal"
                            disabled={readOnly}
                            {...form.register(`lines.${index}.credit`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-9"
                            disabled={readOnly}
                            {...form.register(`lines.${index}.narration`)}
                          />
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={fields.length <= 2}
                              onClick={() => remove(index)}
                              aria-label="Remove line"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lineTotals.debit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lineTotals.credit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell
                        colSpan={readOnly ? 1 : 2}
                        className={cn(
                          "text-xs",
                          Math.abs(lineTotals.diff) < 0.005
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        {Math.abs(lineTotals.diff) < 0.005
                          ? "Balanced"
                          : `Difference ${lineTotals.diff.toLocaleString()}`}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {linesError && <p className="text-xs text-destructive">{linesError}</p>}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                {readOnly ? "Close" : "Cancel"}
              </DialogClose>
              {!readOnly && (
                <Button type="submit">{dialogMode === "edit" ? "Save changes" : "Save journal"}</Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function JournalVoucherMasterPage() {
  return (
    <AccessGate module="voucherJournal">
      {(roleDef) => <JournalList roleDef={roleDef} />}
    </AccessGate>
  );
}
