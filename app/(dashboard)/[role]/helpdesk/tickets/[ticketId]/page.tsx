"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Lock, Mail, Send, Ticket } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [composerBody, setComposerBody] = useState("");
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
    if (!ticket || !composerBody.trim()) {
      toast.error("Enter a message");
      return;
    }
    setSending(true);
    try {
      const updated = await postHelpdeskTicketMessage(ticket.ticketId, {
        kind: composerKind,
        bodyText: composerBody.trim(),
        createdBy: actorKey || undefined,
      });
      setTicket(updated);
      setComposerBody("");
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

  const assigneeOptions = employees.filter((e) => e.userId > 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={ticket.subject}
        description={`${ticket.ticketNumber} · ${ticket.requesterEmail ?? "unknown sender"}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/helpdesk/tickets`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Conversation
            </h2>
            {(ticket.messages ?? []).length === 0 ? (
              <EmptyState
                icon={Mail}
                tone="muted"
                heading="No messages"
                description="No email messages on this ticket yet."
                size="compact"
              />
            ) : (
              (ticket.messages ?? []).map((msg) => {
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
                      {msg.bodyHtml && !isNote ? (
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={composerKind === "reply" ? "default" : "outline"}
                  onClick={() => setComposerKind("reply")}
                >
                  <Mail className="h-4 w-4" />
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
              <Textarea
                rows={6}
                placeholder={
                  composerKind === "reply"
                    ? "Write a public reply to the requester (sent by email)…"
                    : "Write an internal note (not emailed)…"
                }
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => void onSend()} disabled={sending || !composerBody.trim()}>
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : composerKind === "reply" ? "Send reply" : "Add note"}
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
                  value={ticket.status}
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
                  value={ticket.priority}
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
                  value={ticket.departmentId ? String(ticket.departmentId) : NONE}
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
                          ticket.departmentName ??
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
                  value={ticket.assigneeUserId ? String(ticket.assigneeUserId) : NONE}
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
                          : ticket.assigneeName ?? value;
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
                  <dd className="font-mono">{ticket.ticketNumber}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Channel</dt>
                  <dd>{ticket.channel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Requester</dt>
                  <dd className="truncate text-end">{ticket.requesterEmail ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Mailbox</dt>
                  <dd className="truncate text-end">{ticket.mailboxAddress ?? "—"}</dd>
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
