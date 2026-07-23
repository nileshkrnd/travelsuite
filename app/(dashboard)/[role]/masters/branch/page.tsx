"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, GitBranch, MoreHorizontal } from "lucide-react";
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
import { useBranchesStore } from "@/lib/store/branches.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { can } from "@/config/permissions";
import type { Branch, RoleDef } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Branch name is required"),
  companyId: z.string().min(1, "Select a company"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
});
type FormValues = z.infer<typeof schema>;

function BranchDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}) {
  const companies = useCompaniesStore((s) => s.companies);
  const addBranch = useBranchesStore((s) => s.addBranch);
  const updateBranch = useBranchesStore((s) => s.updateBranch);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: branch?.name ?? "",
      companyId: branch?.companyId ?? companies[0]?.id ?? "",
      city: branch?.city ?? "",
      country: branch?.country ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (branch) {
      updateBranch(branch.id, values);
      toast.success("Branch updated");
    } else {
      addBranch(values);
      toast.success("Branch created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Edit branch" : "Add branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchName">Branch name</Label>
            <Input id="branchName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
              {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {branch ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchList({ roleDef }: { roleDef: RoleDef }) {
  const branches = useBranchesStore((s) => s.branches);
  const updateBranch = useBranchesStore((s) => s.updateBranch);
  const companies = useCompaniesStore((s) => s.companies);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>();
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const canEdit = can(roleDef, "branch", "edit");
  const canCreate = can(roleDef, "branch", "create");

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const filtered = useMemo(
    () => (companyFilter === "all" ? branches : branches.filter((b) => b.companyId === companyFilter)),
    [branches, companyFilter]
  );

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(branch: Branch) {
    setEditing(branch);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Branch"
        description="Branches within each company."
        actions={
          canCreate ? (
            <Button onClick={openAdd} disabled={companies.length === 0}>
              <Plus className="h-4 w-4" />
              Add branch
            </Button>
          ) : undefined
        }
      />

      {companies.length > 0 && (
        <Select value={companyFilter} onValueChange={(value) => setCompanyFilter(value ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Card>
        {companies.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            tone="muted"
            heading="Add a company first"
            description="Branches belong to a company — create one under Masters → Company."
            size="compact"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            tone="primary"
            heading="No branches yet"
            description="Add a branch to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{companyName(branch.companyId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city}, {branch.country}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.status === "active" ? "default" : "secondary"}>{branch.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(branch)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateBranch(branch.id, {
                                status: branch.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {branch.status === "active" ? "Deactivate" : "Activate"}
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
      <BranchDialog open={dialogOpen} onOpenChange={setDialogOpen} branch={editing} />
    </div>
  );
}

export default function BranchMasterPage() {
  return <AccessGate module="branch">{(roleDef) => <BranchList roleDef={roleDef} />}</AccessGate>;
}
