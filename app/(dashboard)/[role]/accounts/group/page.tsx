"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  ListTree,
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
import {
  SortableTableHead,
  type SortDirection,
} from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { useTenantStore } from "@/lib/store/tenant.store";
import { can } from "@/config/permissions";
import {
  ACCOUNT_GROUP_NATURES,
  ACCOUNT_GROUP_NORMAL_BALANCES,
  ACCOUNT_GROUP_REPORT_TYPES,
  YES_NO_OPTIONS,
  accountGroupNatureLabel,
  accountGroupReportLabel,
  type AccountGroup,
  type AccountGroupNature,
  type AccountGroupNormalBalance,
  type AccountGroupReportType,
  type RoleDef,
  type YesNo,
} from "@/types";

const nativeSelectClass =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

const ROOT_PARENT = "__primary__";

type SortKey = "code" | "name" | "nature" | "createdAt";

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Group code is required")
    .max(20, "Code must be 20 characters or fewer")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/,
      "Use letters, numbers, underscore or hyphen",
    ),
  name: z.string().trim().min(1, "Group name is required").max(100),
  parentId: z.string().min(1, "Under (parent group) is required"),
  nature: z
    .string()
    .refine(
      (v): v is AccountGroupNature =>
        ACCOUNT_GROUP_NATURES.some((n) => n.value === v),
      {
        message: "Nature of group is required",
      },
    ),
  reportType: z
    .string()
    .refine(
      (v): v is AccountGroupReportType =>
        ACCOUNT_GROUP_REPORT_TYPES.some((n) => n.value === v),
      {
        message: "Report type is required",
      },
    ),
  normalBalance: z
    .string()
    .refine(
      (v): v is AccountGroupNormalBalance =>
        ACCOUNT_GROUP_NORMAL_BALANCES.some((n) => n.value === v),
      {
        message: "Normal balance is required",
      },
    ),
  affectsGrossProfit: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Affects gross profit is required",
    }),
  behavesLikeSubLedger: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Behaves like sub-ledger is required",
    }),
  nettBalancesForReporting: z
    .string()
    .refine((v): v is YesNo => YES_NO_OPTIONS.some((n) => n.value === v), {
      message: "Nett balances for reporting is required",
    }),
  status: z
    .string()
    .refine(
      (v): v is "active" | "inactive" => v === "active" || v === "inactive",
      {
        message: "Status is required",
      },
    ),
});

type FormValues = z.infer<typeof schema>;

function emptyFormValues(): FormValues {
  return {
    code: "",
    name: "",
    parentId: ROOT_PARENT,
    nature: "",
    reportType: "",
    normalBalance: "",
    affectsGrossProfit: "",
    behavesLikeSubLedger: "",
    nettBalancesForReporting: "",
    status: "",
  } as unknown as FormValues;
}

function formValuesFromGroup(group: AccountGroup): FormValues {
  return {
    code: group.code,
    name: group.name,
    parentId: group.parentId ?? ROOT_PARENT,
    nature: group.nature,
    reportType: group.reportType,
    normalBalance: group.normalBalance,
    affectsGrossProfit: group.affectsGrossProfit,
    behavesLikeSubLedger: group.behavesLikeSubLedger,
    nettBalancesForReporting: group.nettBalancesForReporting,
    status: group.status,
  };
}

function applyParentDefaults(
  parent: AccountGroup | undefined,
): Partial<FormValues> {
  if (!parent) {
    return {
      nature: "assets",
      reportType: "balanceSheet",
      normalBalance: "debit",
      affectsGrossProfit: "no",
    };
  }
  return {
    nature: parent.nature,
    reportType: parent.reportType,
    normalBalance: parent.normalBalance,
    affectsGrossProfit: parent.affectsGrossProfit,
  };
}

function GroupDialog({
  open,
  onOpenChange,
  group,
  mode,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: AccountGroup;
  mode: "create" | "edit" | "view";
  groups: AccountGroup[];
}) {
  const addGroup = useAccountGroupsStore((s) => s.addGroup);
  const updateGroup = useAccountGroupsStore((s) => s.updateGroup);
  const isReadOnly = mode === "view";
  const isEdit = mode === "edit";

  const parentOptions = useMemo(() => {
    return groups
      .filter((g) => g.status === "active" && (!group || g.id !== group.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, group]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: group ? formValuesFromGroup(group) : emptyFormValues(),
  });

  const parentId = useWatch({ control, name: "parentId" });

  useEffect(() => {
    if (!open) return;
    reset(group ? formValuesFromGroup(group) : emptyFormValues());
  }, [open, group, reset]);

  function onParentChange(raw: string) {
    setValue("parentId", raw, { shouldValidate: true });
    if (raw === ROOT_PARENT) return;
    const parent = groups.find((g) => g.id === raw);
    const defaults = applyParentDefaults(parent);
    if (defaults.nature)
      setValue("nature", defaults.nature, { shouldValidate: true });
    if (defaults.reportType)
      setValue("reportType", defaults.reportType, { shouldValidate: true });
    if (defaults.normalBalance) {
      setValue("normalBalance", defaults.normalBalance, {
        shouldValidate: true,
      });
    }
    if (defaults.affectsGrossProfit) {
      setValue("affectsGrossProfit", defaults.affectsGrossProfit, {
        shouldValidate: true,
      });
    }
  }

  function onSubmit(values: FormValues) {
    const codeTaken = groups.some(
      (g) =>
        g.id !== group?.id &&
        g.code.toLowerCase() === values.code.trim().toLowerCase(),
    );
    if (codeTaken) {
      toast.error("This group code already exists");
      return;
    }
    const nameTaken = groups.some(
      (g) =>
        g.id !== group?.id &&
        g.name.toLowerCase() === values.name.trim().toLowerCase(),
    );
    if (nameTaken) {
      toast.error("This group name already exists");
      return;
    }

    const payload = {
      code: values.code,
      name: values.name,
      parentId: values.parentId === ROOT_PARENT ? null : values.parentId,
      nature: values.nature,
      reportType: values.reportType,
      normalBalance: values.normalBalance,
      affectsGrossProfit: values.affectsGrossProfit,
      behavesLikeSubLedger: values.behavesLikeSubLedger,
      nettBalancesForReporting: values.nettBalancesForReporting,
      status: values.status,
    };

    if (isEdit && group) {
      updateGroup(group.id, payload);
      toast.success("Account group updated");
    } else {
      addGroup(payload);
      toast.success("Account group created");
    }
    onOpenChange(false);
  }

  const title =
    mode === "create"
      ? "Add account group"
      : mode === "edit"
        ? "Edit account group"
        : "Account group details";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Mock master for review — industry-standard group fields before
            database work.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-4 overflow-y-auto pe-1"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ag-code" required>
                Group code
              </Label>
              <Input
                id="ag-code"
                autoFocus={!isReadOnly}
                disabled={isReadOnly || (isEdit && group?.isSystem)}
                aria-invalid={!!errors.code}
                {...register("code")}
              />
              {errors.code && (
                <p className="text-sm text-destructive">
                  {errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-status" required>
                Status
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    id="ag-status"
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
              {errors.status && (
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ag-name" required>
              Group name
            </Label>
            <Input
              id="ag-name"
              disabled={isReadOnly || (isEdit && group?.isSystem)}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ag-parent" required>
              Under (parent group)
            </Label>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <select
                  id="ag-parent"
                  className={nativeSelectClass}
                  disabled={isReadOnly || (isEdit && group?.isSystem)}
                  aria-invalid={!!errors.parentId}
                  value={field.value}
                  onChange={(e) => onParentChange(e.target.value)}
                >
                  <option value={ROOT_PARENT}>Primary group (no parent)</option>
                  {parentOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.parentId && (
              <p className="text-sm text-destructive">
                {errors.parentId.message}
              </p>
            )}
            {parentId === ROOT_PARENT && (
              <p className="text-xs text-muted-foreground">
                Primary groups sit at the root of the chart of accounts.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ag-nature" required>
                Nature of group
              </Label>
              <Controller
                control={control}
                name="nature"
                render={({ field }) => (
                  <select
                    id="ag-nature"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.nature}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select nature</option>
                    {ACCOUNT_GROUP_NATURES.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.nature && (
                <p className="text-sm text-destructive">
                  {errors.nature.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-report" required>
                Appears in
              </Label>
              <Controller
                control={control}
                name="reportType"
                render={({ field }) => (
                  <select
                    id="ag-report"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.reportType}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select report</option>
                    {ACCOUNT_GROUP_REPORT_TYPES.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.reportType && (
                <p className="text-sm text-destructive">
                  {errors.reportType.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ag-balance" required>
                Normal balance
              </Label>
              <Controller
                control={control}
                name="normalBalance"
                render={({ field }) => (
                  <select
                    id="ag-balance"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.normalBalance}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select balance</option>
                    {ACCOUNT_GROUP_NORMAL_BALANCES.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.normalBalance && (
                <p className="text-sm text-destructive">
                  {errors.normalBalance.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-gp" required>
                Affects gross profit
              </Label>
              <Controller
                control={control}
                name="affectsGrossProfit"
                render={({ field }) => (
                  <select
                    id="ag-gp"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.affectsGrossProfit}
                    value={field.value || ""}
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
              {errors.affectsGrossProfit && (
                <p className="text-sm text-destructive">
                  {errors.affectsGrossProfit.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ag-subledger" required>
                Behaves like sub-ledger
              </Label>
              <Controller
                control={control}
                name="behavesLikeSubLedger"
                render={({ field }) => (
                  <select
                    id="ag-subledger"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.behavesLikeSubLedger}
                    value={field.value || ""}
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
              {errors.behavesLikeSubLedger && (
                <p className="text-sm text-destructive">
                  {errors.behavesLikeSubLedger.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-nett" required>
                Nett balances for reporting
              </Label>
              <Controller
                control={control}
                name="nettBalancesForReporting"
                render={({ field }) => (
                  <select
                    id="ag-nett"
                    className={nativeSelectClass}
                    disabled={isReadOnly}
                    aria-invalid={!!errors.nettBalancesForReporting}
                    value={field.value || ""}
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
              {errors.nettBalancesForReporting && (
                <p className="text-sm text-destructive">
                  {errors.nettBalancesForReporting.message}
                </p>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "Save changes" : "Create group"}
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

function AccountGroupList({ roleDef }: { roleDef: RoleDef }) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const allGroups = useAccountGroupsStore((s) => s.groups);
  const setGroupStatus = useAccountGroupsStore((s) => s.setGroupStatus);
  const deleteGroup = useAccountGroupsStore((s) => s.deleteGroup);

  const [search, setSearch] = useState("");
  const [natureFilter, setNatureFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [selected, setSelected] = useState<AccountGroup | undefined>();

  const canCreate = can(roleDef, "accountGroup", "create");
  const canEdit = can(roleDef, "accountGroup", "edit");
  const canDelete = can(roleDef, "accountGroup", "delete");

  const groups = useMemo(
    () => allGroups.filter((g) => g.tenantId === tenantId),
    [allGroups, tenantId],
  );

  const parentName = (parentId: string | null) => {
    if (!parentId) return "— Primary —";
    return groups.find((g) => g.id === parentId)?.name ?? "—";
  };

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
    let rows = groups;
    if (term) {
      rows = rows.filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          g.code.toLowerCase().includes(term) ||
          accountGroupNatureLabel(g.nature).toLowerCase().includes(term),
      );
    }
    if (natureFilter !== "all") {
      rows = rows.filter((g) => g.nature === natureFilter);
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv), undefined, {
          sensitivity: "base",
        });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [groups, search, natureFilter, sortKey, sortDirection]);

  function openCreate() {
    setSelected(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }
  function openEdit(g: AccountGroup) {
    setSelected(g);
    setDialogMode("edit");
    setDialogOpen(true);
  }
  function openView(g: AccountGroup) {
    setSelected(g);
    setDialogMode("view");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Account Group"
        description="Chart of accounts group master (mock data) — review fields before database work."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add group
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className={`${nativeSelectClass} sm:w-48`}
          value={natureFilter}
          onChange={(e) => setNatureFilter(e.target.value)}
        >
          <option value="all">All natures</option>
          {ACCOUNT_GROUP_NATURES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground sm:ms-auto">
          {visible.length} group(s)
        </p>
      </div>

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={ListTree}
            tone="muted"
            heading="No account groups"
            description="Create a group or clear filters."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sr.</TableHead>
                <SortableTableHead
                  sortKey="code"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="name"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Group name
                </SortableTableHead>
                <TableHead>Under</TableHead>
                <SortableTableHead
                  sortKey="nature"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Nature
                </SortableTableHead>
                <TableHead>Report</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((g, index) => (
                <TableRow key={g.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {g.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      {g.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {parentName(g.parentId)}
                  </TableCell>
                  <TableCell>{accountGroupNatureLabel(g.nature)}</TableCell>
                  <TableCell className="text-sm">
                    {accountGroupReportLabel(g.reportType)}
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {g.normalBalance}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={g.status === "active" ? "default" : "secondary"}
                    >
                      {g.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(g)}>
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(g)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setGroupStatus(
                                g.id,
                                g.status === "active" ? "inactive" : "active",
                              );
                              toast.success(
                                g.status === "active"
                                  ? "Group deactivated"
                                  : "Group activated",
                              );
                            }}
                          >
                            {g.status === "active" ? (
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
                        {canDelete && !g.isSystem && (
                          <DropdownMenuItem
                            onClick={() => {
                              const ok = deleteGroup(g.id);
                              if (!ok) {
                                toast.error(
                                  "Cannot delete — system group or has child groups",
                                );
                                return;
                              }
                              toast.success("Group deleted");
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

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selected}
        mode={dialogMode}
        groups={groups}
      />
    </div>
  );
}

export default function AccountGroupPage() {
  return (
    <AccessGate module="accountGroup">
      {(roleDef) => <AccountGroupList roleDef={roleDef} />}
    </AccessGate>
  );
}
