"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Headphones,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Ticket,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpdeskRichComposer, plainTextToHtml } from "@/components/helpdesk/HelpdeskRichComposer";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listDepartments } from "@/lib/services/departments.service";
import { listEmployees } from "@/lib/services/employees.service";
import {
  getHelpdeskTicket,
  updateHelpdeskTicket,
  postHelpdeskTicketMessage,
  HelpdeskApiError,
} from "@/lib/services/helpdesk.service";
import { applyHelpdeskMacro, HELPDESK_MACROS } from "@/config/helpdesk-macros";
import { getFirstResponseSla, isPendingOnUs, waitingParty } from "@/lib/helpdesk-queue";
import { cn } from "@/lib/utils";
import type { Department, Employee, HelpdeskTicket } from "@/types";

const NONE = "__none__";

function TicketDetail() {
  const { role, ticketId } = useParams<{ role: string; ticketId: string }>();
  const id = Number(ticketId);
  const sessionUser = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const companyId = sessionUser?.companyKey || sessionUser?.employeeCompanyKey || undefined;
  const actorKey = sessionUser
    ? (users.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;

  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerKind, setComposerKind] = useState<"reply" | "note">("reply");
  const [composerHtml, setComposerHtml] = useState("<p></p>");
  const [composerText, setComposerText] = useState("");
  const [composerContentKey, setComposerContentKey] = useState(0);
  const [macroSelectKey, setMacroSelectKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [savingProps, setSavingProps] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid ticket id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getHelpdeskTicket(id)
      .then((row) => {
        if (!cancelled) setTicket(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof HelpdeskApiError ? err.message : "Failed to load ticket");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (tenantKey <= 0) return;
    const scope = {
      tenantId: tenantKey,
      companyId: companyId && companyId > 0 ? companyId : undefined,
      activeOnly: true,
    };
    Promise.all([listDepartments(scope), listEmployees(scope)])
      .then(([deps, emps]) => {
        setDepartments(deps);
        setEmployees(emps);
      })
      .catch(() => {
        setDepartments([]);
        setEmployees([]);
      });
  }, [tenantKey, companyId]);

  async function patchTicket(patch: {
    status?: string;
    priority?: string;
    departmentId?: number | null;
    assigneeUserId?: number | null;
  }) {
    if (!ticket) return;
    setSavingProps(true);
    try {
      const updated = await updateHelpdeskTicket(ticket.ticketId, {
        ...patch,
        modifiedBy: actorKey || undefined,
      });
      setTicket(updated);
      toast.success("Ticket updated");
    } catch (err) {
      toast.error(err instanceof HelpdeskApiError ? err.message : "Could not update ticket");
    } finally {
      setSavingProps(false);
    }
  }

  async function onSend() {
    if (!ticket || !composerText.trim()) {
      toast.error("Enter a message");
      return;
    }
    const isWhatsApp = ticket.channel === "whatsapp";
    setSending(true);
    try {
      const updated = await postHelpdeskTicketMessage(ticket.ticketId, {
        kind: composerKind,
        bodyText: composerText.trim(),
        bodyHtml: isWhatsApp ? null : composerHtml,
        createdBy: actorKey || undefined,
      });
      setTicket(updated);
      setComposerHtml("<p></p>");
      setComposerText("");
      setComposerContentKey((k) => k + 1);
      toast.success(composerKind === "reply" ? "Reply sent" : "Internal note added");
    } catch (err) {
      toast.error(err instanceof HelpdeskApiError ? err.message : "Could not post message");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading ticket…</div>;
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Ticket}
          tone="muted"
          heading="Ticket not found"
          description={error ?? "This ticket may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/helpdesk/tickets`} />}>
              Back to tickets
            </Button>
          }
        />
      </div>
    );
  }

  const currentTicket = ticket;
  const isWhatsApp = currentTicket.channel === "whatsapp";
  const assigneeOptions = employees.filter((e) => e.userId > 0);
  const pendingUs = isPendingOnUs(currentTicket);
  const waiting = waitingParty(currentTicket);
  const sla = getFirstResponseSla(currentTicket);
  const agentName = sessionUser?.name ?? "Support";

  function insertMacro(macroId: string) {
    const macro = HELPDESK_MACROS.find((m) => m.id === macroId);
    if (!macro) return;
    const plain = applyHelpdeskMacro(macro.body, {
      requesterName: currentTicket.requesterName || currentTicket.requesterEmail,
      ticketNumber: currentTicket.ticketNumber,
      agentName,
      subject: currentTicket.subject,
    });
    setComposerKind("reply");
    setComposerText(plain.trim());
    if (isWhatsApp) {
      setComposerHtml("<p></p>");
    } else {
      setComposerHtml(plainTextToHtml(plain));
    }
    setComposerContentKey((k) => k + 1);
    setMacroSelectKey((k) => k + 1);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={currentTicket.subject}
        description={`${currentTicket.ticketNumber} · ${currentTicket.requesterEmail ?? "unknown sender"}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/helpdesk/tickets`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {isWhatsApp ? (
          <Badge variant="outline" className="gap-1 border-emerald-600/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3.5 w-3.5" />
            Email
          </Badge>
        )}
        {pendingUs && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-600/50 bg-amber-500/15 text-amber-900 dark:text-amber-200"
          >
            <Headphones className="h-3.5 w-3.5" />
            Pending on us
          </Badge>
        )}
        {waiting === "customer" && <Badge variant="secondary">Waiting on customer</Badge>}
        {sla?.breached ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            First-response SLA breached ({sla.hours}h)
          </Badge>
        ) : sla && !sla.met ? (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            First reply due {formatDistanceToNow(sla.dueAt, { addSuffix: true })} ({sla.hours}h SLA)
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Conversation
            </h2>
            {(currentTicket.messages ?? []).length === 0 ? (
              <EmptyState
                icon={isWhatsApp ? MessageCircle : Mail}
                tone="muted"
                heading="No messages"
                description={
                  isWhatsApp
                    ? "No WhatsApp messages on this ticket yet."
                    : "No email messages on this ticket yet."
                }
                size="compact"
              />
            ) : (
              (currentTicket.messages ?? []).map((msg) => {
                const isNote = msg.direction === "note" || msg.isInternal;
                const isOutbound = msg.direction === "outbound";
                return (
                  <Card
                    key={msg.ticketMessageId}
                    className={cn(
                      isNote && "border-amber-500/40 bg-amber-500/5",
                      isOutbound && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {isNote ? (
                              <span className="inline-flex items-center gap-1">
                                <Lock className="h-3.5 w-3.5" />
                                Internal note
                              </span>
                            ) : (
                              msg.fromName || msg.fromEmail || "Unknown"
                            )}
                          </p>
                          {!isNote && <p className="text-sm text-muted-foreground">{msg.fromEmail}</p>}
                        </div>
                        <div className="text-end text-sm text-muted-foreground">
                          <Badge variant="outline" className="mb-1">
                            {isNote ? "note" : msg.direction}
                          </Badge>
                          <p>
                            {msg.receivedAt
                              ? format(new Date(msg.receivedAt), "dd MMM yyyy HH:mm")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {msg.subject && !isNote && <p className="text-sm font-medium">{msg.subject}</p>}
                      {msg.bodyHtml ? (
                        <div
                          className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {msg.bodyText || msg.bodyPreview || "—"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={composerKind === "reply" ? "default" : "outline"}
                  onClick={() => setComposerKind("reply")}
                >
                  {isWhatsApp ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  Reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={composerKind === "note" ? "default" : "outline"}
                  onClick={() => setComposerKind("note")}
                >
                  <Lock className="h-4 w-4" />
                  Internal note
                </Button>
              </div>
              {composerKind === "reply" && (
                <div className="space-y-2">
                  <Label>Insert macro</Label>
                  <Select
                    key={macroSelectKey}
                    onValueChange={(v) => {
                      if (typeof v === "string" && v) insertMacro(v);
                    }}
                  >
                    <SelectTrigger className="w-full sm:max-w-sm">
                      <SelectValue placeholder="Choose a starter reply…" />
                    </SelectTrigger>
                    <SelectContent>
                      {HELPDESK_MACROS.map((macro) => (
                        <SelectItem key={macro.id} value={macro.id}>
                          {macro.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isWhatsApp ? (
                <Textarea
                  key={`${composerKind}-${composerContentKey}`}
                  value={composerText}
                  onChange={(e) => {
                    setComposerText(e.target.value);
                    setComposerHtml("<p></p>");
                  }}
                  rows={6}
                  placeholder={
                    composerKind === "reply"
                      ? "Write a WhatsApp reply (plain text, max 4096 characters)…"
                      : "Write an internal note (not sent to the customer)…"
                  }
                  className="min-h-32"
                />
              ) : (
                <HelpdeskRichComposer
                  key={`${composerKind}-${composerContentKey}`}
                  html={composerHtml}
                  contentKey={composerContentKey}
                  onChange={({ html, text }) => {
                    setComposerHtml(html);
                    setComposerText(text);
                  }}
                  placeholder={
                    composerKind === "reply"
                      ? "Write a public reply to the requester (sent by email)…"
                      : "Write an internal note (not emailed)…"
                  }
                />
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={() => void onSend()} disabled={sending || !composerText.trim()}>
                  <Send className="h-4 w-4" />
                  {sending
                    ? "Sending…"
                    : composerKind === "reply"
                      ? isWhatsApp
                        ? "Send WhatsApp"
                        : "Send reply"
                      : "Add note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Properties
              </h2>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentTicket.status}
                  onValueChange={(v) => v && void patchTicket({ status: v })}
                  disabled={savingProps}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={currentTicket.priority}
                  onValueChange={(v) => v && void patchTicket({ priority: v })}
                  disabled={savingProps}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={currentTicket.departmentId ? String(currentTicket.departmentId) : NONE}
                  onValueChange={(v) => {
                    if (!v) return;
                    void patchTicket({ departmentId: v === NONE ? null : Number(v) });
                  }}
                  disabled={savingProps}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "Unassigned";
                        return (
                          departments.find((d) => String(d.departmentId) === value)?.departmentName ??
                          currentTicket.departmentName ??
                          value
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                        {d.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={currentTicket.assigneeUserId ? String(currentTicket.assigneeUserId) : NONE}
                  onValueChange={(v) => {
                    if (!v) return;
                    void patchTicket({ assigneeUserId: v === NONE ? null : Number(v) });
                  }}
                  disabled={savingProps}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "Unassigned";
                        const emp = assigneeOptions.find((e) => String(e.userId) === value);
                        return emp
                          ? `${emp.firstName} ${emp.lastName}`.trim()
                          : currentTicket.assigneeName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {assigneeOptions.map((e) => (
                      <SelectItem key={e.userId} value={String(e.userId)}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Ticket</dt>
                  <dd className="font-mono">{currentTicket.ticketNumber}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Waiting</dt>
                  <dd>
                    {waiting === "us"
                      ? "On us"
                      : waiting === "customer"
                        ? "On customer"
                        : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">First-response SLA</dt>
                  <dd className="text-end">
                    {sla?.met
                      ? "Met"
                      : sla?.breached
                        ? "Breached"
                        : sla
                          ? `Due ${format(sla.dueAt, "dd MMM HH:mm")}`
                          : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Channel</dt>
                  <dd>{isWhatsApp ? "WhatsApp" : currentTicket.channel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{isWhatsApp ? "Customer phone" : "Requester"}</dt>
                  <dd className="truncate text-end">{currentTicket.requesterEmail ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Mailbox</dt>
                  <dd className="truncate text-end">{currentTicket.mailboxAddress ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function HelpdeskTicketDetailPage() {
  return <AccessGate module="helpdeskTickets">{() => <TicketDetail />}</AccessGate>;
}
