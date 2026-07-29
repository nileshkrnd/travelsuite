"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  BookMarked,
  MoreHorizontal,
  Search,
  Pencil,
  Eye,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
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
import { useAccountGroupsStore } from "@/lib/store/account-groups.store";
import { useLedgersStore } from "@/lib/store/ledgers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { can } from "@/config/permissions";
import {
  LEDGER_BALANCE_SIDES,
  YES_NO_OPTIONS,
  accountGroupNatureLabel,
  ledgerBalanceSideLabel,
  type Ledger,
  type LedgerBalanceSide,
  type RoleDef,
  type YesNo,
} from "@/types";

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

type SortKey = "code" | "name" | "createdAt";

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Ledger code is required")
    .max(20, "Code must be 20 characters or fewer")
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/, "Use letters, numbers, underscore or hyphen"),
  name: z.string().trim().min(1, "Ledger name is required").max(150),
  groupId: z.string().min(1, "Under (account group) is required"),
  openingBalance: z
    .string()
    .trim()
    .min(1, "Opening balance is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid amount (0 or more)"),
  openingBalanceType: z
    .string()
    .refine((v): v is LedgerBalanceSide => LEDGER_BALANCE_SIDES.some((s) => s.value === v), {
      message: "Opening balance type is required",
    }),
  billByBill: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Bill-by-bill is required",
    }),
  inventoryValuesAffected: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Inventory values affected is required",
    }),
  costCentresApplicable: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Cost centres applicable is required",
    }),
  creditPeriodDays: z.string().trim(),
  creditLimit: z.string().trim(),
  mailingName: z.string().trim().max(150),
  status: z
    .string()
    .refine((v): v is "active" | "inactive" => v === "active" || v === "inactive", {
      message: "Status is required",
    }),
});

type FormValues = z.infer<typeof schema>;

function emptyFormValues(): FormValues {
  return {
    code: "",
    name: "",
    groupId: "",
    openingBalance: "0",
    openingBalanceType: "",
    billByBill: "",
    inventoryValuesAffected: "",
    costCentresApplicable: "",
    creditPeriodDays: "",
    creditLimit: "",
    mailingName: "",
    status: "",
  };
}

function formValuesFromLedger(ledger: Ledger): FormValues {
  return {
    code: ledger.code,
    name: ledger.name,
    groupId: ledger.groupId,
    openingBalance: String(ledger.openingBalance),
    openingBalanceType: ledger.openingBalanceType,
    billByBill: ledger.billByBill,
    inventoryValuesAffected: ledger.inventoryValuesAffected,
    costCentresApplicable: ledger.costCentresApplicable,
    creditPeriodDays: ledger.creditPeriodDays != null ? String(ledger.creditPeriodDays) : "",
    creditLimit: ledger.creditLimit != null ? String(ledger.creditLimit) : "",
    mailingName: ledger.mailingName,
    status: ledger.status,
  };
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LedgerDialog({
  open,
  onOpenChange,
  ledger,
  mode,
  ledgers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledger?: Ledger;
  mode: "create" | "edit" | "view";
  ledgers: Ledger[];
}) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const addLedger = useLedgersStore((s) => s.addLedger);
  const updateLedger = useLedgersStore((s) => s.updateLedger);
  const isReadOnly = mode === "view";
  const isEdit = mode === "edit";

  const groups = useMemo(
    () =>
      allGroups
        .filter((g) => g.tenantId === tenantId && g.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allGroups, tenantId]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: ledger ? formValuesFromLedger(ledger) : emptyFormValues(),
  });

  const groupId = useWatch({ control, name: "groupId" });
  const billByBill = useWatch({ control, name: "billByBill" });

  useEffect(() => {
    if (!open) return;
    reset(ledger ? formValuesFromLedger(ledger) : emptyFormValues());
  }, [open, ledger, reset]);

  function onGroupChange(raw: string) {
    setValue("groupId", raw, { shouldValidate: true });
    const group = groups.find((g) => g.id === raw);
    if (group) {
      setValue("openingBalanceType", group.normalBalance, { shouldValidate: true });
      // Party-style groups default bill-by-bill on
      if (group.id === "ag_debtors" || group.id === "ag_creditors" || group.behavesLikeSubLedger === "yes") {
        setValue("billByBill", "yes", { shouldValidate: true });
      } else if (!billByBill) {
        setValue("billByBill", "no", { shouldValidate: true });
      }
    }
  }

  function onSubmit(values: FormValues) {
    const codeTaken = ledgers.some(
      (l) => l.id !== ledger?.id && l.code.toLowerCase() === values.code.trim().toLowerCase()
    );
    if (codeTaken) {
      toast.error("This ledger code already exists");
      return;
    }
    const nameTaken = ledgers.some(
      (l) => l.id !== ledger?.id && l.name.toLowerCase() === values.name.trim().toLowerCase()
    );
    if (nameTaken) {
      toast.error("This ledger name already exists");
      return;
    }

    const creditPeriodDays = parseOptionalNumber(values.creditPeriodDays);
    const creditLimit = parseOptionalNumber(values.creditLimit);
    if (values.creditPeriodDays.trim() && (creditPeriodDays == null || creditPeriodDays < 0)) {
      toast.error("Credit period must be a valid number of days");
      return;
    }
    if (values.creditLimit.trim() && (creditLimit == null || creditLimit < 0)) {
      toast.error("Credit limit must be a valid amount");
      return;
    }

    const payload = {
      code: values.code,
      name: values.name,
      groupId: values.groupId,
      openingBalance: Number(values.openingBalance),
      openingBalanceType: values.openingBalanceType,
      billByBill: values.billByBill,
      inventoryValuesAffected: values.inventoryValuesAffected,
      costCentresApplicable: values.costCentresApplicable,
      creditPeriodDays,
      creditLimit,
      mailingName: values.mailingName,
      status: values.status,
    };

    if (isEdit && ledger) {
      updateLedger(ledger.id, payload);
      toast.success("Ledger updated");
    } else {
      addLedger(payload);
      toast.success("Ledger created");
    }
    onOpenChange(false);
  }

  const title =
    mode === "create" ? "Add ledger" : mode === "edit" ? "Edit ledger" : "Ledger details";

  const selectedGroup = groups.find((g) => g.id === groupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Mock ledger master for review — industry-standard fields before database work.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-4 overflow-y-auto pe-1"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="led-code" required>
                Ledger code
              </Label>
              <Input
                id="led-code"
                autoFocus={!isReadOnly}
                disabled={isReadOnly || (isEdit && ledger?.isSystem)}
                aria-invalid={!!errors.code}
                {...register("code")}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-status" required>
                Status
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    id="led-status"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.status}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                )}
              />
              {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="led-name" required>
              Ledger name
            </Label>
            <Input
              id="led-name"
              disabled={isReadOnly || (isEdit && ledger?.isSystem)}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="led-group" required>
              Under (account group)
            </Label>
            <Controller
              control={control}
              name="groupId"
              render={({ field }) => (
                <select
                  id="led-group"
                  className={nativeSelectClass}
                  disabled={isReadOnly || (isEdit && ledger?.isSystem)}
                  aria-invalid={!!errors.groupId}
                  value={field.value}
                  onChange={(e) => onGroupChange(e.target.value)}
                >
                  <option value="">Select account group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code}) — {accountGroupNatureLabel(g.nature)}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.groupId && <p className="text-sm text-destructive">{errors.groupId.message}</p>}
            {selectedGroup && (
              <p className="text-xs text-muted-foreground">
                Report: {selectedGroup.reportType === "balanceSheet" ? "Balance Sheet" : "Profit and Loss"} ·
                Normal balance: {selectedGroup.normalBalance}
              </p>
            )}
            {groups.length === 0 && (
              <p className="text-xs text-destructive">
                No account groups found — create groups under Finance → Account Group first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="led-mailing">Mailing name</Label>
            <Input
              id="led-mailing"
              disabled={isReadOnly}
              placeholder="Optional — defaults to ledger name on statements"
              {...register("mailingName")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="led-ob" required>
                Opening balance
              </Label>
              <Input
                id="led-ob"
                type="number"
                min={0}
                step="0.01"
                disabled={isReadOnly}
                aria-invalid={!!errors.openingBalance}
                {...register("openingBalance")}
              />
              {errors.openingBalance && (
                <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-ob-type" required>
                Opening balance type
              </Label>
              <Controller
                control={control}
                name="openingBalanceType"
                render={({ field }) => (
                  <select
                    id="led-ob-type"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.openingBalanceType}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select Debit / Credit</option>
                    {LEDGER_BALANCE_SIDES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.openingBalanceType && (
                <p className="text-sm text-destructive">{errors.openingBalanceType.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="led-bill" required>
                Bill-by-bill
              </Label>
              <Controller
                control={control}
                name="billByBill"
                render={({ field }) => (
                  <select
                    id="led-bill"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.billByBill}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select</option>
                    {YES_NO_OPTIONS.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.billByBill && (
                <p className="text-sm text-destructive">{errors.billByBill.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-inv" required>
                Inventory values
              </Label>
              <Controller
                control={control}
                name="inventoryValuesAffected"
                render={({ field }) => (
                  <select
                    id="led-inv"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.inventoryValuesAffected}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select</option>
                    {YES_NO_OPTIONS.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.inventoryValuesAffected && (
                <p className="text-sm text-destructive">{errors.inventoryValuesAffected.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-cc" required>
                Cost centres
              </Label>
              <Controller
                control={control}
                name="costCentresApplicable"
                render={({ field }) => (
                  <select
                    id="led-cc"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.costCentresApplicable}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select</option>
                    {YES_NO_OPTIONS.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.costCentresApplicable && (
                <p className="text-sm text-destructive">{errors.costCentresApplicable.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="led-credit-days">Credit period (days)</Label>
              <Input
                id="led-credit-days"
                type="number"
                min={0}
                disabled={isReadOnly}
                placeholder="Optional"
                {...register("creditPeriodDays")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-credit-limit">Credit limit</Label>
              <Input
                id="led-credit-limit"
                type="number"
                min={0}
                step="0.01"
                disabled={isReadOnly}
                placeholder="Optional"
                {...register("creditLimit")}
              />
            </div>
          </div>

          {!isReadOnly && (
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isSubmitting || groups.length === 0}>
                {isEdit ? "Save changes" : "Create ledger"}
              </Button>
            </DialogFooter>
          )}
          {isReadOnly && (
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Close</DialogClose>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LedgerList({ roleDef }: { roleDef: RoleDef }) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const allLedgers = useLedgersStore((s) => s.ledgers);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const setLedgerStatus = useLedgersStore((s) => s.setLedgerStatus);
  const deleteLedger = useLedgersStore((s) => s.deleteLedger);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [selected, setSelected] = useState<Ledger | undefined>();

  const canCreate = can(roleDef, "ledger", "create");
  const canEdit = can(roleDef, "ledger", "edit");
  const canDelete = can(roleDef, "ledger", "delete");

  const ledgers = useMemo(
    () => allLedgers.filter((l) => l.tenantId === tenantId),
    [allLedgers, tenantId]
  );
  const groups = useMemo(
    () => allGroups.filter((g) => g.tenantId === tenantId),
    [allGroups, tenantId]
  );

  const groupName = (groupId: string) => groups.find((g) => g.id === groupId)?.name ?? "—";

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = ledgers;
    if (term) {
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.code.toLowerCase().includes(term) ||
          groupName(l.groupId).toLowerCase().includes(term)
      );
    }
    if (groupFilter !== "all") {
      rows = rows.filter((l) => l.groupId === groupFilter);
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [ledgers, search, groupFilter, sortKey, sortDirection, groups]);

  function openCreate() {
    setSelected(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }
  function openEdit(l: Ledger) {
    setSelected(l);
    setDialogMode("edit");
    setDialogOpen(true);
  }
  function openView(l: Ledger) {
    setSelected(l);
    setDialogMode("view");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Ledger Master"
        description="Chart of accounts ledgers (mock data) — review fields before database work."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add ledger
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className={`${nativeSelectClass} sm:w-64`}
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="all">All groups</option>
          {groups
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
        <p className="text-sm text-muted-foreground sm:ms-auto">{visible.length} ledger(s)</p>
      </div>

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            tone="muted"
            heading="No ledgers"
            description="Create a ledger under an account group, or clear filters."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sr.</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Ledger name
                </SortableTableHead>
                <TableHead>Under</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead>Dr / Cr</TableHead>
                <TableHead>Bill-wise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l, index) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{l.code}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.name}</span>
                      {l.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{groupName(l.groupId)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatAmount(l.openingBalance)}
                  </TableCell>
                  <TableCell className="text-sm">{ledgerBalanceSideLabel(l.openingBalanceType)}</TableCell>
                  <TableCell className="capitalize text-sm">{l.billByBill}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(l)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(l)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setLedgerStatus(l.id, l.status === "active" ? "inactive" : "active");
                              toast.success(l.status === "active" ? "Ledger deactivated" : "Ledger activated");
                            }}
                          >
                            {l.status === "active" ? (
                              <>
                                <PowerOff className="h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {canDelete && !l.isSystem && (
                          <DropdownMenuItem
                            onClick={() => {
                              const ok = deleteLedger(l.id);
                              if (!ok) {
                                toast.error("Cannot delete system ledger");
                                return;
                              }
                              toast.success("Ledger deleted");
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

      <LedgerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ledger={selected}
        mode={dialogMode}
        ledgers={ledgers}
      />
    </div>
  );
}

export default function LedgerMasterPage() {
  return <AccessGate module="ledger">{(roleDef) => <LedgerList roleDef={roleDef} />}</AccessGate>;
}
