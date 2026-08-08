"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  CircleDot,
  Headphones,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useSessionStore } from "@/lib/store/session.store";
import { listDepartments } from "@/lib/services/departments.service";
import {
  listHelpdeskTickets,
  syncHelpdeskMailbox,
  HelpdeskApiError,
} from "@/lib/services/helpdesk.service";
import { cn } from "@/lib/utils";
import type { Department, HelpdeskTicket, RoleDef } from "@/types";

type StatusFilter = "all" | "open" | "pending" | "resolved" | "closed";
type PriorityFilter = "all" | "low" | "normal" | "high" | "urgent";
const ALL = "all";
const AUTO_SYNC_MS = 60_000;

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "open") return "default";
  if (status === "pending" || status === "resolved") return "secondary";
  return "outline";
}

function priorityVariant(priority: string): "default" | "secondary" | "outline" | "destructive" {
  if (priority === "urgent" || priority === "high") return "destructive";
  if (priority === "normal") return "secondary";
  return "outline";
}

function TicketsList({ roleDef: _roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const sessionUser = useSessionStore((s) => s.user);
  const companyId = sessionUser?.companyKey || sessionUser?.employeeCompanyKey || undefined;

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>(ALL);
  const syncingRef = useRef(false);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const rows = await listHelpdeskTickets({
          tenantId: tenantKey > 0 ? tenantKey : undefined,
          status: statusFilter,
          priority: priorityFilter,
          departmentId:
            departmentFilter !== ALL && Number(departmentFilter) > 0
              ? Number(departmentFilter)
              : undefined,
        });
        setTickets(rows);
      } catch (error) {
        if (!opts?.silent) {
          toast.error(error instanceof HelpdeskApiError ? error.message : "Failed to load tickets");
        }
        if (!opts?.silent) setTickets([]);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [tenantKey, statusFilter, priorityFilter, departmentFilter]
  );

  const runSync = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      if (!opts?.silent) setSyncing(true);
      try {
        const result = await syncHelpdeskMailbox({
          tenantId: tenantKey > 0 ? tenantKey : undefined,
        });
        const created = result.createdTickets + result.appendedMessages;
        if (!opts?.silent) {
          const boxCount = result.mailboxesSynced ?? 1;
          toast.success(
            `Synced ${boxCount} mailbox(es): fetched ${result.fetched}, ${result.createdTickets} new, ${result.appendedMessages} replies, ${result.skipped} skipped`
          );
          if (result.errors?.length) {
            toast.error(result.errors.slice(0, 2).join("; "));
          }
          if (result.fetched === 0) {
            toast.message(
              "No inbox messages in the sync window. Add mailboxes under Helpdesk → Support Mailboxes, then sync again."
            );
          }
        } else if (created > 0) {
          toast.message(
            `Mailbox auto-sync: ${result.createdTickets} new ticket(s), ${result.appendedMessages} reply update(s)`
          );
        }
        if (result.errors.length && !opts?.silent) toast.error(result.errors[0]);
        setLastAutoSyncAt(new Date());
        await refresh({ silent: true });
      } catch (error) {
        if (!opts?.silent) {
          toast.error(error instanceof HelpdeskApiError ? error.message : "Sync failed");
        }
      } finally {
        syncingRef.current = false;
        if (!opts?.silent) setSyncing(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (tenantKey <= 0) return;
    listDepartments({
      tenantId: tenantKey,
      companyId: companyId && companyId > 0 ? companyId : undefined,
      activeOnly: true,
    })
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [tenantKey, companyId]);

  // Auto-sync mailbox every 60s while this screen is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void runSync({ silent: true });
    }, AUTO_SYNC_MS);
    return () => window.clearInterval(id);
  }, [runSync]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(term) ||
        t.ticketNumber.toLowerCase().includes(term) ||
        (t.requesterEmail ?? "").toLowerCase().includes(term) ||
        (t.requesterName ?? "").toLowerCase().includes(term) ||
        (t.departmentName ?? "").toLowerCase().includes(term) ||
        (t.assigneeName ?? "").toLowerCase().includes(term)
    );
  }, [tickets, search]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const unrepliedOpen = tickets.filter((t) => t.status === "open" && !t.hasAgentReply).length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Support Tickets"
        description="Open tickets are highlighted. Auto-syncs the mailbox every 60 seconds while you stay on this page."
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button onClick={() => void runSync()} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync mailbox
            </Button>
            <p className="text-xs text-muted-foreground">
              {lastAutoSyncAt
                ? `Last sync ${formatDistanceToNow(lastAutoSyncAt, { addSuffix: true })}`
                : "Auto-sync every 60s"}
            </p>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tickets</p>
              <p className="text-2xl font-semibold tabular-nums">{tickets.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <CircleDot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-2xl font-semibold tabular-nums">{openCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold tabular-nums">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open · awaiting reply</p>
              <p className="text-2xl font-semibold tabular-nums">{unrepliedOpen}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder="Search subject, requester, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string | null) => {
                if (value === "open") return "Open";
                if (value === "pending") return "Pending";
                if (value === "resolved") return "Resolved";
                if (value === "closed") return "Closed";
                return "All statuses";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter((v as PriorityFilter) ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string | null) => {
                if (value === "low") return "Low";
                if (value === "normal") return "Normal";
                if (value === "high") return "High";
                if (value === "urgent") return "Urgent";
                return "All priorities";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? ALL)}>
          <SelectTrigger className="w-48">
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === ALL) return "All departments";
                return departments.find((d) => String(d.departmentId) === value)?.departmentName ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                {d.departmentName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tickets…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Mail}
          tone="primary"
          heading="No tickets yet"
          description="Sync the mailbox or adjust filters. New emails create tickets automatically."
          size="compact"
          action={
            <Button onClick={() => void runSync()} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync mailbox
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {visible.map((ticket) => {
              const isOpen = ticket.status === "open";
              const replied = !!ticket.hasAgentReply;
              const inbound = ticket.inboundCount ?? 0;
              const outbound = ticket.outboundCount ?? 0;
              return (
                <li key={ticket.ticketId}>
                  <Link
                    href={`/${role}/helpdesk/tickets/${ticket.ticketId}`}
                    className={cn(
                      "flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between",
                      isOpen && "border-l-4 border-l-primary bg-primary/[0.03]"
                    )}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                        <Badge variant={statusVariant(ticket.status)} className={cn(isOpen && "ring-1 ring-primary/40")}>
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1">
                              <CircleDot className="h-3 w-3" />
                              open
                            </span>
                          ) : (
                            ticket.status
                          )}
                        </Badge>
                        <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                        {replied ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Replied ({outbound})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-400">
                            <Mail className="h-3 w-3" />
                            Awaiting reply
                          </Badge>
                        )}
                        {ticket.departmentName && <Badge variant="outline">{ticket.departmentName}</Badge>}
                      </div>
                      <p className="truncate font-medium">{ticket.subject}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {ticket.requesterName || ticket.requesterEmail || "Unknown sender"}
                        {ticket.requesterEmail && ticket.requesterName ? ` · ${ticket.requesterEmail}` : ""}
                        {ticket.assigneeName ? ` · Assigned: ${ticket.assigneeName}` : " · Unassigned"}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {inbound} customer · {outbound} agent · {ticket.messageCount ?? 0} total
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          Last activity:{" "}
                          {ticket.lastActivityBy
                            ? `${ticket.lastActivityBy}${
                                ticket.lastActivityDirection === "outbound"
                                  ? " (agent)"
                                  : ticket.lastActivityDirection === "inbound"
                                    ? " (customer)"
                                    : ""
                              }`
                            : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Reply className="h-3 w-3" />
                          Opened{" "}
                          {ticket.createdDtTm
                            ? `${format(new Date(ticket.createdDtTm), "dd MMM yyyy HH:mm")} (${formatDistanceToNow(
                                new Date(ticket.createdDtTm),
                                { addSuffix: true }
                              )})`
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm text-muted-foreground lg:text-end">
                      <p className="font-medium text-foreground">
                        {ticket.lastMessageAt
                          ? formatDistanceToNow(new Date(ticket.lastMessageAt), { addSuffix: true })
                          : "—"}
                      </p>
                      <p>last message</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function HelpdeskTicketsPage() {
  return (
    <AccessGate module="helpdeskTickets">{(roleDef) => <TicketsList roleDef={roleDef} />}</AccessGate>
  );
}
