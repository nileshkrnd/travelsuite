"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Users2, MoreHorizontal } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgenciesStore } from "@/lib/store/agencies.store";
import { can } from "@/config/permissions";
import type { Agency, RoleDef } from "@/types";

const schema = z.object({ name: z.string().min(1, "Agency name is required") });
type FormValues = z.infer<typeof schema>;

function AgencyDialog({
  open,
  onOpenChange,
  agency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency?: Agency;
}) {
  const addAgency = useAgenciesStore((s) => s.addAgency);
  const updateAgency = useAgenciesStore((s) => s.updateAgency);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: agency?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (agency) {
      updateAgency(agency.id, { name: values.name });
      toast.success("Agency updated");
    } else {
      addAgency({ name: values.name });
      toast.success("Agency created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{agency ? "Edit agency" : "Add agency"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agencyName">Agency name</Label>
            <Input id="agencyName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {agency ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgencyList({ roleDef }: { roleDef: RoleDef }) {
  const agencies = useAgenciesStore((s) => s.agencies);
  const updateAgency = useAgenciesStore((s) => s.updateAgency);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | undefined>();
  const canEdit = can(roleDef, "agency", "edit");
  const canCreate = can(roleDef, "agency", "create");

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(agency: Agency) {
    setEditing(agency);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Agency"
        description="B2B travel agencies partnered with your tenant."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add agency
            </Button>
          ) : undefined
        }
      />
      <Card>
        {agencies.length === 0 ? (
          <EmptyState
            icon={Users2}
            tone="primary"
            heading="No agencies yet"
            description="Add your first agency partner to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>
                    <Badge variant={agency.status === "active" ? "default" : "secondary"}>{agency.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(agency.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(agency)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateAgency(agency.id, { status: agency.status === "active" ? "inactive" : "active" })
                            }
                          >
                            {agency.status === "active" ? "Deactivate" : "Activate"}
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
      <AgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} agency={editing} />
    </div>
  );
}

export default function AgencyMasterPage() {
  return <AccessGate module="agency">{(roleDef) => <AgencyList roleDef={roleDef} />}</AccessGate>;
}
