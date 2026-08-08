"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, MoreHorizontal } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listEmployees } from "@/lib/services/employees.service";
import { listProperties } from "@/lib/services/properties.service";
import {
  listEmployeePropertyAccess,
  createEmployeePropertyAccess,
  updateEmployeePropertyAccess,
  setEmployeePropertyAccessActive,
  deleteEmployeePropertyAccess,
  EmployeePropertyAccessApiError,
} from "@/lib/services/employee-property-access.service";
import { employeeDisplayName } from "@/types/employee";
import { can } from "@/config/permissions";
import type { Employee, EmployeePropertyAccess, Property, RoleDef } from "@/types";

const FLAGS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canSubmit", label: "Submit" },
  { key: "canApprove", label: "Approve" },
] as const;

const schema = z
  .object({
    employeeId: z.number().int().positive("Employee is required"),
    propertyId: z.number().int().positive("Property is required"),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canSubmit: z.boolean(),
    canApprove: z.boolean(),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });
type FormValues = z.infer<typeof schema>;

function AccessDialog({
  open,
  onOpenChange,
  grant,
  employees,
  properties,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grant?: EmployeePropertyAccess;
  employees: Employee[];
  properties: Property[];
  onSaved: (row: EmployeePropertyAccess) => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!grant;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      employeeId: grant?.employeeId ?? 0,
      propertyId: grant?.propertyId ?? 0,
      canView: grant?.canView ?? true,
      canCreate: grant?.canCreate ?? false,
      canEdit: grant?.canEdit ?? false,
      canSubmit: grant?.canSubmit ?? false,
      canApprove: grant?.canApprove ?? false,
      validFrom: grant?.validFrom ?? "",
      validTo: grant?.validTo ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const employee = employees.find((e) => e.employeeId === values.employeeId);
    if (!employee) {
      toast.error("Select an employee");
      return;
    }
    const payload = {
      tenantId: employee.tenantId,
      companyId: employee.companyId,
      employeeId: values.employeeId,
      propertyId: values.propertyId,
      canView: values.canView,
      canCreate: values.canCreate,
      canEdit: values.canEdit,
      canSubmit: values.canSubmit,
      canApprove: values.canApprove,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
    };
    try {
      if (isEdit && grant) {
        const saved = await updateEmployeePropertyAccess(grant.employeePropertyAccessKey, {
          ...payload,
          isActive: grant.isActive,
        });
        onSaved(saved);
        toast.success("Access updated");
      } else {
        const saved = await createEmployeePropertyAccess({ ...payload, createdBy: actorKey });
        onSaved(saved);
        toast.success("Access granted");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof EmployeePropertyAccessApiError ? error.message : "Could not save access grant");
    }
  }

  void tenantKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit property access" : "Grant property access"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label required>Employee</Label>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.employeeId}>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                        {employeeDisplayName(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label required>Property</Label>
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.propertyId}>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.propertyId} value={String(p.propertyId)}>
                        {p.propertyDisplayName || p.propertyName || p.propertyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyId && <p className="text-sm text-destructive">{errors.propertyId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FLAGS.map((flag) => (
                <Controller
                  key={flag.key}
                  control={control}
                  name={flag.key}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                      {flag.label}
                    </label>
                  )}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid from</Label>
              <Input id="validFrom" type="date" {...register("validFrom")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid to</Label>
              <Input id="validTo" type="date" {...register("validTo")} />
              {errors.validTo && <p className="text-sm text-destructive">{errors.validTo.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save" : "Grant access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeePropertyAccessList({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const [grants, setGrants] = useState<EmployeePropertyAccess[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeePropertyAccess | undefined>();
  const canEdit = can(roleDef, "employeePropertyAccess", "edit");
  const canCreate = can(roleDef, "employeePropertyAccess", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listEmployeePropertyAccess({ tenantId: tenantKey }),
      listEmployees({ tenantId: tenantKey, activeOnly: true }),
      listProperties({ tenantId: tenantKey, includeGlobal: true }),
    ])
      .then(([grantRows, employeeRows, propertyRows]) => {
        if (cancelled) return;
        setGrants(grantRows);
        setEmployees(employeeRows);
        setProperties(propertyRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load property access grants");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: EmployeePropertyAccess) {
    setGrants((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(grant: EmployeePropertyAccess) {
    try {
      const saved = await setEmployeePropertyAccessActive(grant.employeePropertyAccessKey, !grant.isActive);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof EmployeePropertyAccessApiError ? error.message : "Could not update status");
    }
  }

  async function removeGrant(grant: EmployeePropertyAccess) {
    try {
      await deleteEmployeePropertyAccess(grant.employeePropertyAccessKey);
      setGrants((prev) => prev.filter((r) => r.id !== grant.id));
      toast.success("Access grant removed");
    } catch (error) {
      toast.error(error instanceof EmployeePropertyAccessApiError ? error.message : "Could not remove grant");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee Property Access"
        description="Grant an employee explicit view/create/edit/submit/approve access to a property."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <Card>
        {!loading && grants.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            tone="primary"
            heading="No access grants yet"
            description="Grant an employee access to a property to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="font-medium">{grant.employeeName ?? `Employee ${grant.employeeId}`}</TableCell>
                  <TableCell>{grant.propertyName ?? `Property ${grant.propertyId}`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {FLAGS.filter((f) => grant[f.key]).map((f) => (
                        <Badge key={f.key} variant="outline">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={grant.isActive ? "default" : "secondary"}>
                      {grant.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(grant);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleActive(grant)}>
                            {grant.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void removeGrant(grant)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <AccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        grant={editing}
        employees={employees}
        properties={properties}
        onSaved={upsertLocal}
      />
    </div>
  );
}

export default function EmployeePropertyAccessPage() {
  return (
    <AccessGate module="employeePropertyAccess">
      {(roleDef) => <EmployeePropertyAccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
