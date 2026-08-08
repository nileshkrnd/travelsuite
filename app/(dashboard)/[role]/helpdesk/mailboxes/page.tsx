"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import {
  createHelpdeskMailbox,
  deleteHelpdeskMailbox,
  HelpdeskMailboxesApiError,
  listHelpdeskMailboxes,
  setHelpdeskMailboxActive,
  updateHelpdeskMailbox,
} from "@/lib/services/helpdesk-mailboxes.service";
import { can } from "@/config/permissions";
import type { HelpdeskMailbox, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const formSchema = z.object({
  mailboxAddress: z.string().trim().email("Valid email is required").max(200),
  displayName: z.string().trim().max(200).optional(),
  provider: z.enum(["gmail", "microsoft365"]),
  isShared: z.boolean(),
  syncLookbackHours: z.number().int().min(1).max(8760),
  imapHost: z.string().trim().max(200).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  smtpHost: z.string().trim().max(200).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  appPassword: z.string().trim().max(200).optional(),
  ms365TenantId: z.string().trim().max(100).optional(),
  ms365ClientId: z.string().trim().max(100).optional(),
  ms365ClientSecret: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function MailboxPanel({
  mode,
  mailbox,
  tenantId,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  mailbox?: HelpdeskMailbox;
  tenantId: number;
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mailboxAddress: mailbox?.mailboxAddress ?? "",
      displayName: mailbox?.displayName ?? "",
      provider: mailbox?.provider === "microsoft365" ? "microsoft365" : "gmail",
      isShared: mailbox?.isShared ?? false,
      syncLookbackHours: mailbox?.syncLookbackHours ?? 720,
      imapHost: mailbox?.imapHost ?? "imap.gmail.com",
      imapPort: mailbox?.imapPort ?? 993,
      smtpHost: mailbox?.smtpHost ?? "smtp.gmail.com",
      smtpPort: mailbox?.smtpPort ?? 465,
      appPassword: "",
      ms365TenantId: mailbox?.ms365TenantId ?? "",
      ms365ClientId: mailbox?.ms365ClientId ?? "",
      ms365ClientSecret: "",
    },
  });

  const provider = watch("provider");

  async function onSubmit(values: FormValues) {
    if (!userKey || tenantId <= 0) {
      toast.error("Missing session tenant — sign in again.");
      return;
    }
    if (mode === "create" && values.provider === "gmail" && !values.appPassword?.trim()) {
      toast.error("Gmail App Password is required");
      return;
    }
    if (mode === "create" && values.provider === "microsoft365") {
      if (!values.ms365TenantId?.trim() || !values.ms365ClientId?.trim() || !values.ms365ClientSecret?.trim()) {
        toast.error("Azure tenant ID, client ID, and client secret are required");
        return;
      }
    }

    const payload = {
      mailboxAddress: values.mailboxAddress.trim().toLowerCase(),
      displayName: values.displayName?.trim() || null,
      provider: values.provider,
      isShared: values.isShared,
      syncLookbackHours: values.syncLookbackHours,
      imapHost: values.provider === "gmail" ? values.imapHost?.trim() || "imap.gmail.com" : null,
      imapPort: values.provider === "gmail" ? Number(values.imapPort) || 993 : null,
      smtpHost: values.provider === "gmail" ? values.smtpHost?.trim() || "smtp.gmail.com" : null,
      smtpPort: values.provider === "gmail" ? Number(values.smtpPort) || 465 : null,
      appPassword: values.appPassword?.trim() || null,
      ms365TenantId: values.ms365TenantId?.trim() || null,
      ms365ClientId: values.ms365ClientId?.trim() || null,
      ms365ClientSecret: values.ms365ClientSecret?.trim() || null,
    };

    try {
      if (mode === "edit" && mailbox) {
        await updateHelpdeskMailbox(mailbox.mailboxId, {
          ...payload,
          modifiedBy: userKey,
        });
        toast.success("Mailbox updated");
      } else if (mode === "create") {
        await createHelpdeskMailbox({
          ...payload,
          tenantId,
          createdBy: userKey,
        });
        toast.success("Mailbox added");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Could not save mailbox"
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create"
              ? "Add support mailbox"
              : mode === "edit"
                ? "Edit support mailbox"
                : "Mailbox details"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Gmail or Microsoft 365 inboxes used for ticketing. Multiple addresses are
            supported per tenant.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mailboxAddress" required>
            Support email
          </Label>
          <Input
            id="mailboxAddress"
            type="email"
            autoFocus={!isReadOnly}
            disabled={isReadOnly || mode === "edit"}
            aria-invalid={!!errors.mailboxAddress}
            {...register("mailboxAddress")}
          />
          {errors.mailboxAddress && (
            <p className="text-sm text-destructive">{errors.mailboxAddress.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" disabled={isReadOnly} {...register("displayName")} />
        </div>

        <div className="space-y-2">
          <Label required>Provider</Label>
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isReadOnly || mode === "edit"}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value === "microsoft365" ? "Microsoft 365" : "Gmail"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail (IMAP + App Password)</SelectItem>
                  <SelectItem value="microsoft365">Microsoft 365 (Graph)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="syncLookbackHours">Sync lookback (hours)</Label>
          <Input
            id="syncLookbackHours"
            type="number"
            min={1}
            max={8760}
            disabled={isReadOnly}
            {...register("syncLookbackHours", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Shared inbox</Label>
          <Controller
            control={control}
            name="isShared"
            render={({ field }) => (
              <Select
                value={field.value ? "yes" : "no"}
                onValueChange={(v) => field.onChange(v === "yes")}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) => (value === "yes" ? "Yes" : "No")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {provider === "gmail" && (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="appPassword" required={mode === "create"}>
                Gmail App Password
              </Label>
              <Input
                id="appPassword"
                type="password"
                autoComplete="new-password"
                placeholder={
                  mode === "edit" && mailbox?.hasCredentials
                    ? "Leave blank to keep existing"
                    : "16-character app password"
                }
                disabled={isReadOnly}
                {...register("appPassword")}
              />
              <p className="text-xs text-muted-foreground">
                Google Account → Security → 2-Step Verification → App passwords
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapHost">IMAP host</Label>
              <Input id="imapHost" disabled={isReadOnly} {...register("imapHost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapPort">IMAP port</Label>
              <Input
                id="imapPort"
                type="number"
                disabled={isReadOnly}
                {...register("imapPort", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP host</Label>
              <Input id="smtpHost" disabled={isReadOnly} {...register("smtpHost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP port</Label>
              <Input
                id="smtpPort"
                type="number"
                disabled={isReadOnly}
                {...register("smtpPort", { valueAsNumber: true })}
              />
            </div>
          </>
        )}

        {provider === "microsoft365" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="ms365TenantId" required>
                Azure tenant ID
              </Label>
              <Input
                id="ms365TenantId"
                disabled={isReadOnly}
                aria-invalid={!!errors.ms365TenantId}
                {...register("ms365TenantId")}
              />
              {errors.ms365TenantId && (
                <p className="text-sm text-destructive">{errors.ms365TenantId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms365ClientId" required>
                Azure client ID
              </Label>
              <Input
                id="ms365ClientId"
                disabled={isReadOnly}
                aria-invalid={!!errors.ms365ClientId}
                {...register("ms365ClientId")}
              />
              {errors.ms365ClientId && (
                <p className="text-sm text-destructive">{errors.ms365ClientId.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ms365ClientSecret" required={mode === "create"}>
                Azure client secret
              </Label>
              <Input
                id="ms365ClientSecret"
                type="password"
                autoComplete="new-password"
                placeholder={
                  mode === "edit" && mailbox?.hasCredentials
                    ? "Leave blank to keep existing"
                    : "Client secret value"
                }
                disabled={isReadOnly}
                {...register("ms365ClientSecret")}
              />
            </div>
          </>
        )}

        {mode === "view" && mailbox && (
          <div className="sm:col-span-2 grid gap-2 text-sm text-muted-foreground">
            <p>
              Credentials:{" "}
              <Badge variant={mailbox.hasCredentials ? "secondary" : "outline"}>
                {mailbox.hasCredentials ? "Configured" : "Missing"}
              </Badge>
            </p>
            <p>
              Last sync:{" "}
              {mailbox.lastSyncAt ? format(new Date(mailbox.lastSyncAt), "dd MMM yyyy HH:mm") : "Never"}
            </p>
            <p>Tickets linked: {mailbox.ticketCount ?? 0}</p>
          </div>
        )}

        {!isReadOnly && (
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Add mailbox" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function MailboxesList({ roleDef }: { roleDef: RoleDef }) {
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const sessionUser = useSessionStore((s) => s.user);
  const userKey = sessionUser?.userKey ?? 0;

  const [rows, setRows] = useState<HelpdeskMailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [panel, setPanel] = useState<PanelMode>("closed");
  const [selected, setSelected] = useState<HelpdeskMailbox | undefined>();

  const canCreate = can(roleDef, "helpdeskMailboxes", "create");
  const canUpdate = can(roleDef, "helpdeskMailboxes", "edit");
  const canDelete = can(roleDef, "helpdeskMailboxes", "delete");

  const refresh = useCallback(async () => {
    if (tenantKey <= 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listHelpdeskMailboxes({ tenantId: tenantKey }));
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Failed to load mailboxes"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (!q) return true;
      return (
        r.mailboxAddress.toLowerCase().includes(q) ||
        (r.displayName ?? "").toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  async function toggleActive(row: HelpdeskMailbox) {
    try {
      await setHelpdeskMailboxActive(row.mailboxId, !row.isActive, userKey);
      toast.success(row.isActive ? "Mailbox deactivated" : "Mailbox activated");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Could not update status"
      );
    }
  }

  async function remove(row: HelpdeskMailbox) {
    if (!window.confirm(`Remove mailbox ${row.mailboxAddress}? Existing tickets stay linked.`)) {
      return;
    }
    try {
      await deleteHelpdeskMailbox(row.mailboxId);
      toast.success("Mailbox removed");
      if (selected?.mailboxId === row.mailboxId) {
        setPanel("closed");
        setSelected(undefined);
      }
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Could not delete mailbox"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support mailboxes"
        description="Tenant Admin setup for Gmail / Microsoft 365 inboxes used by helpdesk ticketing."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setSelected(undefined);
                setPanel("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add mailbox
            </Button>
          ) : undefined
        }
      />

      {panel !== "closed" && (
        <MailboxPanel
          key={`${panel}-${selected?.mailboxId ?? "new"}`}
          mode={panel}
          mailbox={selected}
          tenantId={tenantKey}
          userKey={userKey}
          onClose={() => {
            setPanel("closed");
            setSelected(undefined);
          }}
          onSaved={refresh}
        />
      )}

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search email or provider…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-10 w-full sm:w-40">
              <SelectValue>
                {(value: string | null) =>
                  value === "active" ? "Active" : value === "inactive" ? "Inactive" : "All statuses"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading mailboxes…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            tone="muted"
            size="compact"
            heading="No support mailboxes"
            description="Add one or more Gmail / Microsoft 365 addresses for inbound ticket sync."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mailbox</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.mailboxId}>
                  <TableCell>
                    <div className="font-medium">{row.displayName || row.mailboxAddress}</div>
                    <div className="text-xs text-muted-foreground">{row.mailboxAddress}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row.provider === "microsoft365" ? "Microsoft 365" : "Gmail"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "secondary" : "outline"}>
                      {row.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.hasCredentials ? "secondary" : "destructive"}>
                      {row.hasCredentials ? "Set" : "Missing"}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.ticketCount ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.lastSyncAt
                      ? format(new Date(row.lastSyncAt), "dd MMM yyyy HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(row);
                            setPanel("view");
                          }}
                        >
                          View
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(row);
                              setPanel("edit");
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => void toggleActive(row)}>
                            {row.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => void remove(row)}
                          >
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
    </div>
  );
}

export default function HelpdeskMailboxesPage() {
  return (
    <AccessGate module="helpdeskMailboxes">{(roleDef) => <MailboxesList roleDef={roleDef} />}</AccessGate>
  );
}
