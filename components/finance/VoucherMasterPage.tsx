"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
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
} from "lucide-react";
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
import { JournalVoucherMasterPage } from "@/components/finance/JournalVoucherMasterPage";
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
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
  type AccountGroup,
  type CurrencyCode,
  type Ledger,
  type RoleDef,
  type Voucher,
  type VoucherKind,
  type VoucherStatus,
} from "@/types";

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

type SortKey = "date" | "voucherNo" | "amount";
type DialogMode = "create" | "edit" | "view";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  voucherNo: z.string().trim().max(30),
  partyLedgerId: z.string().min(1, "This account is required"),
  accountLedgerId: z.string().min(1, "This account is required"),
  /** Optional — empty string means not tagged */
  costCenterId: z.string(),
  departmentId: z.string(),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Enter an amount greater than 0"),
  referenceNo: z.string().trim().max(60),
  narration: z.string().trim().max(300),
  status: z
    .string()
    .refine((v): v is VoucherStatus => VOUCHER_STATUSES.some((s) => s.value === v), {
      message: "Status is required",
    }),
});

type FormValues = z.infer<typeof schema>;

function emptyFormValues(): FormValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    voucherNo: "",
    partyLedgerId: "",
    accountLedgerId: "",
    costCenterId: "",
    departmentId: "",
    amount: "",
    referenceNo: "",
    narration: "",
    status: "draft",
  };
}

function formValuesFromVoucher(v: Voucher): FormValues {
  return {
    date: v.date,
    voucherNo: v.voucherNo,
    partyLedgerId: v.partyLedgerId ?? "",
    accountLedgerId: v.accountLedgerId ?? "",
    costCenterId: v.costCenterId ?? "",
    departmentId: v.departmentId ?? "",
    amount: String(v.amount),
    referenceNo: v.referenceNo,
    narration: v.narration,
    status: v.status,
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

function expandGroupIds(roots: string[], groups: AccountGroup[]): Set<string> {
  const ids = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of groups) {
      if (g.parentId && ids.has(g.parentId) && !ids.has(g.id)) {
        ids.add(g.id);
        changed = true;
      }
    }
  }
  return ids;
}

function ledgersInGroups(
  ledgers: Ledger[],
  groupIds: string[],
  tenantId: string,
  groups: AccountGroup[]
): Ledger[] {
  const set = expandGroupIds(groupIds, groups);
  return ledgers
    .filter((l) => l.tenantId === tenantId && l.status === "active" && set.has(l.groupId))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function VoucherList({ kind, roleDef }: { kind: VoucherKind; roleDef: RoleDef }) {
  const config = VOUCHER_KIND_CONFIGS[kind];
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const allLedgers = useLedgersStore((s) => s.ledgers);
  const allGroups = useAccountGroupsStore((s) => s.groups);
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

  const partyOptions = useMemo(
    () => ledgersInGroups(allLedgers, config.partyGroupIds, tenantId, allGroups),
    [allLedgers, config.partyGroupIds, tenantId, allGroups]
  );
  const accountOptions = useMemo(
    () => ledgersInGroups(allLedgers, config.accountGroupIds, tenantId, allGroups),
    [allLedgers, config.accountGroupIds, tenantId, allGroups]
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
    document.title = `${config.title} · Klyra`;
  }, [config.title]);

  const rows = useMemo(() => {
    let list = vouchers.filter((v) => v.tenantId === tenantId && v.kind === kind);
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.voucherNo.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q) ||
          ledgerName(v.partyLedgerId).toLowerCase().includes(q) ||
          ledgerName(v.accountLedgerId).toLowerCase().includes(q) ||
          costCenterName(v.costCenterId).toLowerCase().includes(q) ||
          departmentName(v.departmentId).toLowerCase().includes(q)
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
    kind,
    statusFilter,
    search,
    sortKey,
    sortDirection,
    ledgerName,
    costCenterName,
    departmentName,
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

  function onSort(key: string) {
    const k = key as SortKey;
    if (sortKey === k) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDirection(k === "date" ? "desc" : "asc");
    }
  }

  function onSubmit(values: FormValues) {
    if (values.partyLedgerId === values.accountLedgerId) {
      toast.error("From and To accounts must be different");
      return;
    }
    const payload = {
      kind,
      date: values.date,
      partyLedgerId: values.partyLedgerId,
      accountLedgerId: values.accountLedgerId,
      costCenterId: values.costCenterId || null,
      departmentId: values.departmentId || null,
      amount: Number(values.amount),
      narration: values.narration,
      referenceNo: values.referenceNo,
      status: values.status,
      voucherNo: values.voucherNo || undefined,
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New {config.title.replace(/ Voucher$/, "").replace(/ Note$/, " note")}
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
            placeholder="Search voucher, party, narration…"
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
            heading={`No ${config.title.toLowerCase()}s yet`}
            description="Create an entry to start posting mock transactions for this voucher type."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Create entry
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
                <TableHead>{config.partyLabel}</TableHead>
                <TableHead className="hidden xl:table-cell">{config.accountLabel}</TableHead>
                <TableHead className="hidden md:table-cell">Cost centre</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
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
                  <TableCell className="max-w-[160px] truncate">
                    {ledgerName(v.partyLedgerId)}
                  </TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-muted-foreground xl:table-cell">
                    {ledgerName(v.accountLedgerId)}
                  </TableCell>
                  <TableCell className="hidden max-w-[120px] truncate text-muted-foreground md:table-cell">
                    {costCenterName(v.costCenterId)}
                  </TableCell>
                  <TableCell className="hidden max-w-[120px] truncate text-muted-foreground lg:table-cell">
                    {departmentName(v.departmentId)}
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" && `New ${config.title}`}
              {dialogMode === "edit" && `Edit ${selected?.voucherNo ?? config.title}`}
              {dialogMode === "view" && selected?.voucherNo}
            </DialogTitle>
            <DialogDescription>
              Standard voucher entry — accounts, amount, optional cost centre and department.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vch-date">Date</Label>
                <Input id="vch-date" type="date" disabled={readOnly} {...form.register("date")} />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vch-no">Voucher no.</Label>
                <Input
                  id="vch-no"
                  placeholder="Auto on save"
                  disabled={readOnly}
                  {...form.register("voucherNo")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vch-party">{config.partyLabel}</Label>
              <Controller
                control={form.control}
                name="partyLedgerId"
                render={({ field }) => (
                  <select
                    id="vch-party"
                    className={nativeSelectClass}
                    disabled={readOnly}
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <option value="">Select…</option>
                    {partyOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.partyLedgerId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.partyLedgerId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vch-account">{config.accountLabel}</Label>
              <Controller
                control={form.control}
                name="accountLedgerId"
                render={({ field }) => (
                  <select
                    id="vch-account"
                    className={nativeSelectClass}
                    disabled={readOnly}
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <option value="">Select…</option>
                    {accountOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.accountLedgerId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.accountLedgerId.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vch-cost-center">Cost centre</Label>
                <Controller
                  control={form.control}
                  name="costCenterId"
                  render={({ field }) => (
                    <select
                      id="vch-cost-center"
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
                <Label htmlFor="vch-department">Department</Label>
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <select
                      id="vch-department"
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
                <Label htmlFor="vch-amount">Amount</Label>
                <Input
                  id="vch-amount"
                  inputMode="decimal"
                  disabled={readOnly}
                  {...form.register("amount")}
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vch-status">Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <select
                      id="vch-status"
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
              <Label htmlFor="vch-ref">Reference no.</Label>
              <Input id="vch-ref" disabled={readOnly} {...form.register("referenceNo")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vch-narration">Narration</Label>
              <Input id="vch-narration" disabled={readOnly} {...form.register("narration")} />
            </div>

            {dialogMode === "view" && selected && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <p className="mb-2 font-medium text-foreground">Entry lines</p>
                <ul className="space-y-1 text-muted-foreground">
                  {selected.lines.map((ln) => (
                    <li key={ln.id} className="flex justify-between gap-2">
                      <span>{ledgerName(ln.ledgerId)}</span>
                      <span className="tabular-nums">
                        {ln.debit > 0 ? `Dr ${ln.debit.toLocaleString()}` : `Cr ${ln.credit.toLocaleString()}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                {readOnly ? "Close" : "Cancel"}
              </DialogClose>
              {!readOnly && (
                <Button type="submit">{dialogMode === "edit" ? "Save changes" : "Save voucher"}</Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VoucherMasterPage({ kind }: { kind: VoucherKind }) {
  if (kind === "journal") return <JournalVoucherMasterPage />;
  const config = VOUCHER_KIND_CONFIGS[kind];
  return (
    <AccessGate module={config.module}>
      {(roleDef) => <VoucherList kind={kind} roleDef={roleDef} />}
    </AccessGate>
  );
}
