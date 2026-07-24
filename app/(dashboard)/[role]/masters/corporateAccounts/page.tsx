"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Landmark, MoreHorizontal } from "lucide-react";
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
import { useCorporatesStore } from "@/lib/store/corporates.store";
import { can } from "@/config/permissions";
import type { Corporate, RoleDef } from "@/types";

const schema = z.object({ name: z.string().min(1, "Corporate account name is required") });
type FormValues = z.infer<typeof schema>;

function CorporateDialog({
  open,
  onOpenChange,
  corporate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corporate?: Corporate;
}) {
  const addCorporate = useCorporatesStore((s) => s.addCorporate);
  const updateCorporate = useCorporatesStore((s) => s.updateCorporate);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: corporate?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (corporate) {
      updateCorporate(corporate.id, { name: values.name });
      toast.success("Corporate account updated");
    } else {
      addCorporate({ name: values.name });
      toast.success("Corporate account created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{corporate ? "Edit corporate account" : "Add corporate account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="corporateName">Company name</Label>
            <Input id="corporateName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {corporate ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CorporateList({ roleDef }: { roleDef: RoleDef }) {
  const corporates = useCorporatesStore((s) => s.corporates);
  const updateCorporate = useCorporatesStore((s) => s.updateCorporate);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Corporate | undefined>();
  const canEdit = can(roleDef, "corporateAccounts", "edit");
  const canCreate = can(roleDef, "corporateAccounts", "create");

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(corporate: Corporate) {
    setEditing(corporate);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Corporate"
        description="Corporate client companies booking travel through your tenant."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add corporate account
            </Button>
          ) : undefined
        }
      />
      <Card>
        {corporates.length === 0 ? (
          <EmptyState
            icon={Landmark}
            tone="primary"
            heading="No corporate accounts yet"
            description="Add your first corporate client to get started."
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
              {corporates.map((corporate) => (
                <TableRow key={corporate.id}>
                  <TableCell className="font-medium">{corporate.name}</TableCell>
                  <TableCell>
                    <Badge variant={corporate.status === "active" ? "default" : "secondary"}>
                      {corporate.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(corporate.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(corporate)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateCorporate(corporate.id, {
                                status: corporate.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {corporate.status === "active" ? "Deactivate" : "Activate"}
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
      <CorporateDialog open={dialogOpen} onOpenChange={setDialogOpen} corporate={editing} />
    </div>
  );
}

export default function CorporateAccountsMasterPage() {
  return <AccessGate module="corporateAccounts">{(roleDef) => <CorporateList roleDef={roleDef} />}</AccessGate>;
}
