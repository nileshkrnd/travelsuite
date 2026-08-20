"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListChecks, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  listInclusionExclusionTypes,
  createInclusionExclusionType,
  updateInclusionExclusionType,
  setInclusionExclusionTypeActive,
  deleteInclusionExclusionType,
  InclusionExclusionTypesApiError,
} from "@/lib/services/inclusion-exclusion-types.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { InclusionExclusionType, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const baseSchema = z.object({
  typeCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
  typeName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
});

function useTypeSchema(rows: InclusionExclusionType[], currentId?: number) {
  return useMemo(
    () =>
      baseSchema.superRefine((values, ctx) => {
        const codeDuplicate = rows.some(
          (r) => r.inclusionExclusionTypeId !== currentId && r.typeCode.toLowerCase() === values.typeCode.trim().toLowerCase()
        );
        if (codeDuplicate) ctx.addIssue({ code: "custom", path: ["typeCode"], message: "This code already exists" });
        const nameDuplicate = rows.some(
          (r) => r.inclusionExclusionTypeId !== currentId && r.typeName.toLowerCase() === values.typeName.trim().toLowerCase()
        );
        if (nameDuplicate) ctx.addIssue({ code: "custom", path: ["typeName"], message: "This name already exists" });
      }),
    [rows, currentId]
  );
}

type FormValues = z.infer<typeof baseSchema>;

function blankValues(): FormValues {
  return { typeCode: "", typeName: "" };
}

function TypePanel({
  mode,
  row,
  rows,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: InclusionExclusionType;
  rows: InclusionExclusionType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useTypeSchema(rows, row?.inclusionExclusionTypeId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: { typeCode: row?.typeCode ?? "", typeName: row?.typeName ?? "" },
  });

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = { typeCode: values.typeCode.trim(), typeName: values.typeName.trim() };
    try {
      if (mode === "edit" && row) {
        await updateInclusionExclusionType(row.inclusionExclusionTypeId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Type updated");
      } else if (mode === "create") {
        await createInclusionExclusionType({ ...payload, createdBy: userKey });
        toast.success("Type created");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues());
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof InclusionExclusionTypesApiError ? error.message : "Could not save type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add type" : mode === "edit" ? "Edit type" : "Type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3" noValidate>
        <div className="space-y-1">
          <Label htmlFor="typeCode" required>
            Code
          </Label>
          <Input id="typeCode" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. INCLUSION" aria-invalid={!!errors.typeCode} {...register("typeCode")} />
          {errors.typeCode && <p className="text-sm text-destructive">{errors.typeCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="typeName" required>
            Name
          </Label>
          <Input id="typeName" disabled={isReadOnly} placeholder="e.g. Inclusion" aria-invalid={!!errors.typeName} {...register("typeName")} />
          {errors.typeName && <p className="text-sm text-destructive">{errors.typeName.message}</p>}
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & add more
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function TypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<InclusionExclusionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<InclusionExclusionType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "inclusionExclusionType", "edit");
  const canCreate = can(roleDef, "inclusionExclusionType", "create");
  const canDelete = can(roleDef, "inclusionExclusionType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const rowsResult = await listInclusionExclusionTypes();
      setRows(rowsResult);
    } catch (error) {
      setLoadError(error instanceof InclusionExclusionTypesApiError ? error.message : "Failed to load types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) result = result.filter((r) => r.typeName.toLowerCase().includes(term) || r.typeCode.toLowerCase().includes(term));
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: InclusionExclusionType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setInclusionExclusionTypeActive(row.inclusionExclusionTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Type deactivated" : "Type activated");
    } catch (error) {
      toast.error(error instanceof InclusionExclusionTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: InclusionExclusionType) {
    try {
      await deleteInclusionExclusionType(row.inclusionExclusionTypeId);
      await refresh();
      toast.success("Type deleted");
    } catch (error) {
      toast.error(error instanceof InclusionExclusionTypesApiError ? error.message : "Could not delete type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Inclusion / Exclusion Type"
        description="Global lookup — Inclusion, Exclusion."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading types…</p>}

      {panelMode !== "closed" && (
        <TypePanel mode={panelMode} row={target} rows={rows} userKey={userKey} onSaved={refresh} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {!loading && rows.length === 0 ? (
          <EmptyState icon={ListChecks} tone="primary" heading="No types yet" description="Add Inclusion / Exclusion." size="compact" />
        ) : visible.length === 0 && !loading ? (
          <EmptyState icon={Search} tone="muted" heading="No matching types" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%] px-2 py-1.5">Code</TableHead>
                <TableHead className="w-[35%] px-2 py-1.5">Name</TableHead>
                <TableHead className="w-[15%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[25%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.inclusionExclusionTypeId}>
                  <TableCell className="px-2 py-1.5 font-mono leading-tight font-medium">{row.typeCode}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight font-medium">{row.typeName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">{row.isActive ? "active" : "inactive"}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={row.isActive ? "Deactivate" : "Activate"} onClick={() => void toggleActive(row)} />}>
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
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

export default function InclusionExclusionTypeMasterPage() {
  return <AccessGate module="inclusionExclusionType">{(roleDef) => <TypeList roleDef={roleDef} />}</AccessGate>;
}
