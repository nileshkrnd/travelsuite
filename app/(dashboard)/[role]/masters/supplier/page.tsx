"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Store, MoreHorizontal, Settings2 } from "lucide-react";
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
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { useSupplierTypesStore } from "@/lib/store/supplierTypes.store";
import { can } from "@/config/permissions";
import type { RoleDef, Supplier } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  supplierTypeId: z.string().min(1, "Select a type"),
});
type FormValues = z.infer<typeof schema>;

function ManageTypesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const supplierTypes = useSupplierTypesStore((s) => s.supplierTypes);
  const addSupplierType = useSupplierTypesStore((s) => s.addSupplierType);
  const [newType, setNewType] = useState("");

  function handleAdd() {
    const name = newType.trim();
    if (!name) return;
    addSupplierType(name);
    setNewType("");
    toast.success("Supplier type added");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage supplier types</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {supplierTypes.map((type) => (
              <li key={type.id} className="rounded-md border px-3 py-1.5 text-sm">
                {type.name}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="New type, e.g. Cruise Line"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button type="button" onClick={handleAdd}>
              Add
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}) {
  const supplierTypes = useSupplierTypesStore((s) => s.supplierTypes);
  const addSupplier = useSuppliersStore((s) => s.addSupplier);
  const updateSupplier = useSuppliersStore((s) => s.updateSupplier);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: supplier?.name ?? "",
      supplierTypeId: supplier?.supplierTypeId ?? supplierTypes[0]?.id ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (supplier) {
      updateSupplier(supplier.id, values);
      toast.success("Supplier updated");
    } else {
      addSupplier(values);
      toast.success("Supplier created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier name</Label>
            <Input id="supplierName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={control}
              name="supplierTypeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplierTypeId && <p className="text-sm text-destructive">{errors.supplierTypeId.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {supplier ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierList({ roleDef }: { roleDef: RoleDef }) {
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const updateSupplier = useSuppliersStore((s) => s.updateSupplier);
  const supplierTypes = useSupplierTypesStore((s) => s.supplierTypes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typesDialogOpen, setTypesDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>();
  const canEdit = can(roleDef, "supplier", "edit");
  const canCreate = can(roleDef, "supplier", "create");

  const typeName = (id: string) => supplierTypes.find((t) => t.id === id)?.name ?? "—";

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier"
        description="Inventory partners — hoteliers, DMCs, tour operators, and more."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTypesDialogOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Manage types
            </Button>
            {canCreate && (
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add supplier
              </Button>
            )}
          </div>
        }
      />
      <Card>
        {suppliers.length === 0 ? (
          <EmptyState
            icon={Store}
            tone="primary"
            heading="No suppliers yet"
            description="Add your first supplier to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeName(supplier.supplierTypeId)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(supplier.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(supplier)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateSupplier(supplier.id, {
                                status: supplier.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {supplier.status === "active" ? "Deactivate" : "Activate"}
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
      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
      <ManageTypesDialog open={typesDialogOpen} onOpenChange={setTypesDialogOpen} />
    </div>
  );
}

export default function SupplierMasterPage() {
  return <AccessGate module="supplier">{(roleDef) => <SupplierList roleDef={roleDef} />}</AccessGate>;
}
