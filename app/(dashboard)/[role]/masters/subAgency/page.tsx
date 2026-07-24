"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, GitFork, MoreHorizontal } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubAgenciesStore } from "@/lib/store/subAgencies.store";
import { useAgenciesStore } from "@/lib/store/agencies.store";
import { can } from "@/config/permissions";
import type { RoleDef, SubAgency } from "@/types";

const schema = z.object({
  name: z.string().min(1, "SubAgency name is required"),
  agencyId: z.string().min(1, "Select a parent agency"),
});
type FormValues = z.infer<typeof schema>;

function SubAgencyDialog({
  open,
  onOpenChange,
  subAgency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAgency?: SubAgency;
}) {
  const agencies = useAgenciesStore((s) => s.agencies);
  const addSubAgency = useSubAgenciesStore((s) => s.addSubAgency);
  const updateSubAgency = useSubAgenciesStore((s) => s.updateSubAgency);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: subAgency?.name ?? "",
      agencyId: subAgency?.agencyId ?? agencies[0]?.id ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (subAgency) {
      updateSubAgency(subAgency.id, values);
      toast.success("SubAgency updated");
    } else {
      addSubAgency(values);
      toast.success("SubAgency created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subAgency ? "Edit sub-agency" : "Add sub-agency"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subAgencyName">SubAgency name</Label>
            <Input id="subAgencyName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Parent agency</Label>
            <Controller
              control={control}
              name="agencyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an agency" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.agencyId && <p className="text-sm text-destructive">{errors.agencyId.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {subAgency ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubAgencyList({ roleDef }: { roleDef: RoleDef }) {
  const subAgencies = useSubAgenciesStore((s) => s.subAgencies);
  const updateSubAgency = useSubAgenciesStore((s) => s.updateSubAgency);
  const agencies = useAgenciesStore((s) => s.agencies);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubAgency | undefined>();
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const canEdit = can(roleDef, "subAgency", "edit");
  const canCreate = can(roleDef, "subAgency", "create");

  const agencyName = (id: string) => agencies.find((a) => a.id === id)?.name ?? "—";
  const filtered = useMemo(
    () => (agencyFilter === "all" ? subAgencies : subAgencies.filter((s) => s.agencyId === agencyFilter)),
    [subAgencies, agencyFilter]
  );

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(subAgency: SubAgency) {
    setEditing(subAgency);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="SubAgency"
        description="Sub-agencies operating under a parent agency."
        actions={
          canCreate ? (
            <Button onClick={openAdd} disabled={agencies.length === 0}>
              <Plus className="h-4 w-4" />
              Add sub-agency
            </Button>
          ) : undefined
        }
      />

      {agencies.length > 0 && (
        <Select value={agencyFilter} onValueChange={(v) => setAgencyFilter(v ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agencies</SelectItem>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Card>
        {agencies.length === 0 ? (
          <EmptyState
            icon={GitFork}
            tone="muted"
            heading="Add an agency first"
            description="Sub-agencies belong to an agency — create one under Partners → Agency."
            size="compact"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GitFork}
            tone="primary"
            heading="No sub-agencies yet"
            description="Add a sub-agency to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((subAgency) => (
                <TableRow key={subAgency.id}>
                  <TableCell className="font-medium">{subAgency.name}</TableCell>
                  <TableCell>{agencyName(subAgency.agencyId)}</TableCell>
                  <TableCell>
                    <Badge variant={subAgency.status === "active" ? "default" : "secondary"}>
                      {subAgency.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(subAgency)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateSubAgency(subAgency.id, {
                                status: subAgency.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {subAgency.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
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
      <SubAgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} subAgency={editing} />
    </div>
  );
}

export default function SubAgencyMasterPage() {
  return <AccessGate module="subAgency">{(roleDef) => <SubAgencyList roleDef={roleDef} />}</AccessGate>;
}
