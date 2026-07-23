"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Building2, MoreHorizontal } from "lucide-react";
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
import { useCompaniesStore } from "@/lib/store/companies.store";
import { can } from "@/config/permissions";
import type { Company, RoleDef } from "@/types";

const schema = z.object({ name: z.string().min(1, "Company name is required") });
type FormValues = z.infer<typeof schema>;

function CompanyDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
}) {
  const addCompany = useCompaniesStore((s) => s.addCompany);
  const updateCompany = useCompaniesStore((s) => s.updateCompany);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: company?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    if (company) {
      updateCompany(company.id, { name: values.name });
      toast.success("Company updated");
    } else {
      addCompany({ name: values.name });
      toast.success("Company created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {company ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanyList({ roleDef }: { roleDef: RoleDef }) {
  const companies = useCompaniesStore((s) => s.companies);
  const updateCompany = useCompaniesStore((s) => s.updateCompany);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | undefined>();
  const canEdit = can(roleDef, "company", "edit");
  const canCreate = can(roleDef, "company", "create");

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(company: Company) {
    setEditing(company);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Company"
        description="Companies operating under your tenant."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add company
            </Button>
          ) : undefined
        }
      />
      <Card>
        {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            tone="primary"
            heading="No companies yet"
            description="Add your first company to get started."
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
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <Badge variant={company.status === "active" ? "default" : "secondary"}>{company.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(company)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateCompany(company.id, {
                                status: company.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {company.status === "active" ? "Deactivate" : "Activate"}
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
      <CompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} company={editing} />
    </div>
  );
}

export default function CompanyMasterPage() {
  return <AccessGate module="company">{(roleDef) => <CompanyList roleDef={roleDef} />}</AccessGate>;
}
