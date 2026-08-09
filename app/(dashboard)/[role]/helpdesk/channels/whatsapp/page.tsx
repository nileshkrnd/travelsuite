"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Copy, MessageCircle, RefreshCw, Save } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import {
  createHelpdeskMailbox,
  HelpdeskMailboxesApiError,
  listHelpdeskMailboxes,
  setHelpdeskMailboxActive,
  updateHelpdeskMailbox,
} from "@/lib/services/helpdesk-mailboxes.service";
import { getMailboxSyncHealth, type MailboxSyncHealth } from "@/lib/helpdesk-queue";
import { isValidWhatsAppPhone } from "@/lib/whatsapp-phone";
import type { HelpdeskMailbox, RoleDef } from "@/types";

const DEFAULT_DISPLAY = "+97477930700";

function syncHealthLabel(health: MailboxSyncHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "stale":
      return "Stale";
    case "never":
      return "No inbound yet";
    case "missing_credentials":
      return "Missing credentials";
    case "error":
      return "Error";
    case "inactive":
      return "Inactive";
  }
}

const formSchema = z.object({
  mailboxAddress: z
    .string()
    .trim()
    .refine(isValidWhatsAppPhone, "Enter a valid WhatsApp number (E.164, e.g. +97477930700)"),
  displayName: z.string().trim().max(200).optional(),
  waPhoneNumberId: z.string().trim().min(1, "Phone Number ID is required").max(100),
  waBusinessAccountId: z.string().trim().max(100).optional(),
  waAccessToken: z.string().trim().max(2000).optional(),
  waAppSecret: z.string().trim().max(500).optional(),
  waVerifyToken: z.string().trim().max(200).optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function WhatsAppChannelConfig({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const userKey = sessionUser
    ? (users.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;

  const canEdit = can(roleDef, "helpdeskChannelsWhatsApp", "edit") || can(roleDef, "helpdeskChannelsWhatsApp", "create");
  const [rows, setRows] = useState<HelpdeskMailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mailbox = rows[0] ?? null;

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/helpdesk/whatsapp/webhook";
    return `${window.location.origin}/api/helpdesk/whatsapp/webhook`;
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mailboxAddress: DEFAULT_DISPLAY,
      displayName: "WhatsApp Business",
      waPhoneNumberId: "",
      waBusinessAccountId: "",
      waAccessToken: "",
      waAppSecret: "",
      waVerifyToken: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  const refresh = useCallback(async () => {
    if (tenantKey <= 0) return;
    setLoading(true);
    try {
      const list = await listHelpdeskMailboxes({ tenantId: tenantKey, provider: "whatsapp" });
      setRows(list);
      const first = list[0];
      if (first) {
        reset({
          mailboxAddress: first.mailboxAddress || DEFAULT_DISPLAY,
          displayName: first.displayName || "WhatsApp Business",
          waPhoneNumberId: first.waPhoneNumberId || "",
          waBusinessAccountId: first.waBusinessAccountId || "",
          waAccessToken: "",
          waAppSecret: "",
          waVerifyToken: "",
          isActive: first.isActive,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Failed to load WhatsApp config"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reset, tenantKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(values: FormValues) {
    if (!canEdit) {
      toast.error("You do not have permission to update WhatsApp configuration");
      return;
    }
    if (!userKey || tenantKey <= 0) {
      toast.error("Missing session tenant — sign in again.");
      return;
    }
    if (!mailbox && !values.waAccessToken?.trim()) {
      toast.error("Access token is required for the first save");
      return;
    }
    if (!mailbox && !values.waVerifyToken?.trim()) {
      toast.error("Webhook verify token is required for the first save");
      return;
    }

    setSaving(true);
    const payload = {
      mailboxAddress: values.mailboxAddress.trim(),
      displayName: values.displayName?.trim() || values.mailboxAddress.trim(),
      provider: "whatsapp" as const,
      isShared: true,
      isActive: values.isActive,
      waPhoneNumberId: values.waPhoneNumberId.trim(),
      waBusinessAccountId: values.waBusinessAccountId?.trim() || null,
      waAccessToken: values.waAccessToken?.trim() || null,
      waAppSecret: values.waAppSecret?.trim() || null,
      waVerifyToken: values.waVerifyToken?.trim() || null,
    };

    try {
      if (mailbox) {
        await updateHelpdeskMailbox(mailbox.mailboxId, {
          ...payload,
          modifiedBy: userKey,
        });
        toast.success("WhatsApp channel updated");
      } else {
        await createHelpdeskMailbox({
          ...payload,
          tenantId: tenantKey,
          createdBy: userKey,
        });
        toast.success("WhatsApp channel configured");
      }
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Could not save WhatsApp config"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(next: boolean) {
    if (!mailbox || !canEdit) return;
    try {
      await setHelpdeskMailboxActive(mailbox.mailboxId, next, userKey);
      setValue("isActive", next);
      toast.success(next ? "WhatsApp channel activated" : "WhatsApp channel deactivated");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof HelpdeskMailboxesApiError ? error.message : "Could not update status"
      );
    }
  }

  function copyWebhook() {
    void navigator.clipboard.writeText(webhookUrl).then(
      () => toast.success("Webhook URL copied"),
      () => toast.error("Could not copy")
    );
  }

  const health = mailbox ? getMailboxSyncHealth(mailbox) : null;

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading WhatsApp configuration…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="WhatsApp channel"
        description="Connect Meta Cloud API for +974 77930700. Inbound webhooks create tickets; agents reply from the WhatsApp queue."
        actions={
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="space-y-5 pt-5">
            {!mailbox && (
              <EmptyState
                icon={MessageCircle}
                tone="muted"
                heading="Not configured yet"
                description="Save Meta credentials below to start receiving WhatsApp messages as helpdesk tickets."
                size="compact"
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
              <div className="space-y-2">
                <Label htmlFor="mailboxAddress" required>
                  Business WhatsApp number
                </Label>
                <Input
                  id="mailboxAddress"
                  placeholder="+97477930700"
                  disabled={!canEdit}
                  aria-invalid={!!errors.mailboxAddress}
                  {...register("mailboxAddress")}
                />
                {errors.mailboxAddress && (
                  <p className="text-sm text-destructive">{errors.mailboxAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input id="displayName" disabled={!canEdit} {...register("displayName")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waPhoneNumberId" required>
                  Phone Number ID
                </Label>
                <Input
                  id="waPhoneNumberId"
                  disabled={!canEdit}
                  aria-invalid={!!errors.waPhoneNumberId}
                  {...register("waPhoneNumberId")}
                />
                {errors.waPhoneNumberId && (
                  <p className="text-sm text-destructive">{errors.waPhoneNumberId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="waBusinessAccountId">WhatsApp Business Account ID</Label>
                <Input
                  id="waBusinessAccountId"
                  disabled={!canEdit}
                  {...register("waBusinessAccountId")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="waAccessToken" required={!mailbox}>
                  Permanent access token
                </Label>
                <Input
                  id="waAccessToken"
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    mailbox?.hasCredentials ? "Leave blank to keep existing token" : "Meta system user token"
                  }
                  disabled={!canEdit}
                  {...register("waAccessToken")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waAppSecret">App secret (signature verify)</Label>
                <Input
                  id="waAppSecret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={mailbox ? "Leave blank to keep existing" : "Optional in local dev"}
                  disabled={!canEdit}
                  {...register("waAppSecret")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waVerifyToken" required={!mailbox}>
                  Webhook verify token
                </Label>
                <Input
                  id="waVerifyToken"
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    mailbox?.hasWaVerifyToken
                      ? "Leave blank to keep existing"
                      : "Any secret you also enter in Meta"
                  }
                  disabled={!canEdit}
                  {...register("waVerifyToken")}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(v) => {
                    if (!v || !canEdit) return;
                    const next = v === "active";
                    setValue("isActive", next);
                    if (mailbox) void toggleActive(next);
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(value: string | null) => (value === "active" ? "Active" : "Inactive")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {canEdit && (
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : mailbox ? "Save changes" : "Save configuration"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Webhook
              </h2>
              <p className="text-sm text-muted-foreground">
                In Meta Developer → WhatsApp → Configuration, set callback URL and the same verify
                token. Subscribe to <span className="font-medium text-foreground">messages</span>.
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="break-all font-mono text-xs">{webhookUrl}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={copyWebhook}>
                <Copy className="h-4 w-4" />
                Copy URL
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Health
              </h2>
              {mailbox ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Channel</span>
                    <Badge variant={mailbox.isActive ? "default" : "secondary"}>
                      {mailbox.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Credentials</span>
                    <span className="inline-flex items-center gap-1">
                      {mailbox.hasCredentials ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Saved
                        </>
                      ) : (
                        "Missing"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Last inbound</span>
                    <span>
                      {mailbox.lastSyncAt
                        ? formatDistanceToNow(new Date(mailbox.lastSyncAt), { addSuffix: true })
                        : "Never"}
                    </span>
                  </div>
                  {health && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Sync health</span>
                      <Badge variant="outline">{syncHealthLabel(health)}</Badge>
                    </div>
                  )}
                  {mailbox.lastSyncError && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                      {mailbox.lastSyncError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {mailbox.ticketCount ?? 0} ticket(s) on this number
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Save configuration to track inbound health.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function HelpdeskChannelsWhatsAppPage() {
  return (
    <AccessGate module="helpdeskChannelsWhatsApp">
      {(roleDef) => <WhatsAppChannelConfig roleDef={roleDef} />}
    </AccessGate>
  );
}
