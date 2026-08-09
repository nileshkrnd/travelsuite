"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Headphones,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Ticket,
  UserRound,
  UserX,
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
import {
  getFirstResponseSla,
  isPendingOnUs,
  waitingParty,
} from "@/lib/helpdesk-queue";
import { cn } from "@/lib/utils";
import type { Department, HelpdeskTicket, RoleDef } from "@/types";

type StatusFilter = "all" | "open" | "pending" | "resolved" | "closed";
type PriorityFilter = "all" | "low" | "normal" | "high" | "urgent";
type WaitingFilter = "all" | "us" | "customer";
type QueueFilter = "all" | "mine" | "unassigned";
const ALL = "all";
const AUTO_SYNC_MS = 10_000;

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

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "open" || raw === "pending" || raw === "resolved" || raw === "closed" || raw === "all") {
    return raw;
  }
  return "all";
}

export function TicketsList({
  roleDef: _roleDef,
  forcedChannel,
}: {
  roleDef: RoleDef;
  /** When set (e.g. Email menu), always filter to this channel. */
  forcedChannel?: string;
}) {
  const { role } = useParams<{ role: string }>();
  const searchParams = useSearchParams();
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const sessionUser = useSessionStore((s) => s.user);
  const myUserKey = sessionUser?.userKey ?? 0;
  const companyId = sessionUser?.companyKey || sessionUser?.employeeCompanyKey || undefined;

  const channelFilter = (forcedChannel || searchParams.get("channel") || "").trim().toLowerCase();
  const statusFromUrl = parseStatusFilter(searchParams.get("status"));

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(statusFromUrl);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>(ALL);
  const [waitingFilter, setWaitingFilter] = useState<WaitingFilter>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const syncingRef = useRef(false);

  useEffect(() => {
    setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const rows = await listHelpdeskTickets({
          tenantId: tenantKey > 0 ? tenantKey : undefined,
          status: statusFilter,
          priority: priorityFilter,
          channel: channelFilter || undefined,
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
    [tenantKey, statusFilter, priorityFilter, departmentFilter, channelFilter]
  );

  const runSync = useCallback(
    async (opts?: { silent?: boolean; mode?: "quick" | "full" }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      const mode = opts?.mode ?? (opts?.silent ? "quick" : "full");
      if (!opts?.silent) setSyncing(true);
      try {
        const result = await syncHelpdeskMailbox({
          tenantId: tenantKey > 0 ? tenantKey : undefined,
          mode,
        });
        const created = result.createdTickets + result.appendedMessages;
        if (!opts?.silent) {
          const boxCount = result.mailboxesSynced ?? 1;
          if (result.errors?.length && created === 0 && result.fetched === 0) {
            toast.error(result.errors.slice(0, 2).join("; "));
          } else if (created > 0) {
            toast.success(
              `Synced ${boxCount} mailbox(es): ${result.createdTickets} new ticket(s), ${result.appendedMessages} reply update(s)`
            );
            if (result.errors?.length) toast.error(result.errors.slice(0, 2).join("; "));
          } else if (result.fetched === 0) {
            toast.message(
              "No inbox messages in the sync window. Check Helpdesk → Channel Configuration → Email (mailboxes)."
            );
          } else {
            toast.message(
              `Mailbox up to date — checked ${result.fetched} message(s), ${result.skipped} already imported`
            );
            if (result.errors?.length) toast.error(result.errors.slice(0, 2).join("; "));
          }
        } else if (created > 0) {
          toast.message(
            `Mailbox auto-sync: ${result.createdTickets} new ticket(s), ${result.appendedMessages} reply update(s)`
          );
        }
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
    [refresh, tenantKey]
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

  // Initial quick mailbox poll (email queues only).
  useEffect(() => {
    if (channelFilter === "whatsapp") return;
    if (tenantKey <= 0) return;
    void runSync({ silent: true, mode: "quick" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per channel/tenant mount
  }, [channelFilter, tenantKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // Always refresh the list from DB every 10s (fast).
      void refresh({ silent: true });
      // WhatsApp is webhook-push — no IMAP/Graph poll.
      if (channelFilter === "whatsapp") return;
      // Quick IMAP poll in parallel; skipped if a sync is already running.
      void runSync({ silent: true, mode: "quick" });
    }, AUTO_SYNC_MS);
    return () => window.clearInterval(id);
  }, [channelFilter, refresh, runSync]);

  const pendingOnUsCount = useMemo(
    () => tickets.filter((t) => isPendingOnUs(t)).length,
    [tickets]
  );
  const mineCount = useMemo(
    () =>
      myUserKey > 0
        ? tickets.filter((t) => t.assigneeUserId === myUserKey && t.status !== "resolved" && t.status !== "closed")
            .length
        : 0,
    [tickets, myUserKey]
  );
  const unassignedCount = useMemo(
    () =>
      tickets.filter(
        (t) => !t.assigneeUserId && t.status !== "resolved" && t.status !== "closed"
      ).length,
    [tickets]
  );
  const slaBreachedCount = useMemo(
    () => tickets.filter((t) => getFirstResponseSla(t)?.breached).length,
    [tickets]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tickets.filter((t) => {
      if (waitingFilter === "us" && waitingParty(t) !== "us") return false;
      if (waitingFilter === "customer" && waitingParty(t) !== "customer") return false;
      if (queueFilter === "mine") {
        if (!myUserKey || t.assigneeUserId !== myUserKey) return false;
      }
      if (queueFilter === "unassigned" && t.assigneeUserId) return false;
      if (!term) return true;
      return (
        t.subject.toLowerCase().includes(term) ||
        t.ticketNumber.toLowerCase().includes(term) ||
        (t.requesterEmail ?? "").toLowerCase().includes(term) ||
        (t.requesterName ?? "").toLowerCase().includes(term) ||
        (t.departmentName ?? "").toLowerCase().includes(term) ||
        (t.assigneeName ?? "").toLowerCase().includes(term)
      );
    });

    return [...filtered].sort((a, b) => {
      // Pending-on-us first, then newest activity — do not bury fresh mail under old SLA breaches.
      const aUs = isPendingOnUs(a) ? 1 : 0;
      const bUs = isPendingOnUs(b) ? 1 : 0;
      if (aUs !== bUs) return bUs - aUs;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      const aBreach = getFirstResponseSla(a)?.breached ? 1 : 0;
      const bBreach = getFirstResponseSla(b)?.breached ? 1 : 0;
      return bBreach - aBreach;
    });
  }, [tickets, search, waitingFilter, queueFilter, myUserKey]);

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={
          channelFilter === "email"
            ? "Email"
            : channelFilter === "whatsapp"
              ? "WhatsApp"
              : "Support Tickets"
        }
        description={
          channelFilter === "email"
            ? "Email-channel tickets. Pending on us is highlighted and sorted first. Auto-syncs every 10 seconds while this page is open."
            : channelFilter === "whatsapp"
              ? "WhatsApp-channel tickets (webhook ingest). List refreshes every 10 seconds while this page is open."
              : "Pending on us (customer wrote last) is highlighted and sorted first. Auto-syncs every 10 seconds while this page is open."
        }
        actions={
          channelFilter === "whatsapp" ? (
            <div className="flex flex-col items-end gap-1">
              <Button onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <p className="text-xs text-muted-foreground">Inbound via Meta webhook</p>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button onClick={() => void runSync()} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Sync mailbox
              </Button>
              <p className="text-xs text-muted-foreground">
                {lastAutoSyncAt
                  ? `Last sync ${formatDistanceToNow(lastAutoSyncAt, { addSuffix: true })}`
                  : "Auto-sync every 10s"}
              </p>
            </div>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending on us</p>
              <p className="text-2xl font-semibold tabular-nums">{pendingOnUsCount}</p>
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
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My open</p>
              <p className="text-2xl font-semibold tabular-nums">{mineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(slaBreachedCount > 0 && "border-destructive/40 bg-destructive/5")}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                slaBreachedCount > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SLA breached</p>
              <p className="text-2xl font-semibold tabular-nums">{slaBreachedCount}</p>
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
        <Select value={queueFilter} onValueChange={(v) => setQueueFilter((v as QueueFilter) ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {(value: string | null) => {
                if (value === "mine") return `My tickets (${mineCount})`;
                if (value === "unassigned") return `Unassigned (${unassignedCount})`;
                return "All queues";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All queues</SelectItem>
            <SelectItem value="mine">My tickets</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={waitingFilter}
          onValueChange={(v) => setWaitingFilter((v as WaitingFilter) ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {(value: string | null) => {
                if (value === "us") return "Waiting: on us";
                if (value === "customer") return "Waiting: customer";
                return "Waiting: all";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Waiting: all</SelectItem>
            <SelectItem value="us">Waiting: on us</SelectItem>
            <SelectItem value="customer">Waiting: customer</SelectItem>
          </SelectContent>
        </Select>
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
              const pendingUs = isPendingOnUs(ticket);
              const isOpen = ticket.status === "open";
              const replied = !!ticket.hasAgentReply;
              const inbound = ticket.inboundCount ?? 0;
              const outbound = ticket.outboundCount ?? 0;
              const sla = getFirstResponseSla(ticket);
              return (
                <li key={ticket.ticketId}>
                  <Link
                    href={`/${role}/helpdesk/tickets/${ticket.ticketId}`}
                    className={cn(
                      "flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between",
                      pendingUs
                        ? "border-l-4 border-l-amber-500 bg-amber-500/[0.08]"
                        : isOpen && "border-l-4 border-l-primary bg-primary/[0.03]"
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
                        {pendingUs ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-600/50 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                          >
                            <Headphones className="h-3 w-3" />
                            Pending on us
                          </Badge>
                        ) : waitingParty(ticket) === "customer" ? (
                          <Badge variant="secondary" className="gap-1">
                            <UserRound className="h-3 w-3" />
                            Waiting on customer
                          </Badge>
                        ) : null}
                        {!replied && !pendingUs ? (
                          <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-400">
                            <Mail className="h-3 w-3" />
                            Awaiting reply
                          </Badge>
                        ) : replied && !pendingUs ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Replied ({outbound})
                          </Badge>
                        ) : null}
                        {sla?.breached ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            SLA breached
                          </Badge>
                        ) : sla && !sla.met ? (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            First reply due{" "}
                            {formatDistanceToNow(sla.dueAt, { addSuffix: true })}
                          </Badge>
                        ) : null}
                        {!ticket.assigneeUserId && ticket.status !== "resolved" && ticket.status !== "closed" ? (
                          <Badge variant="outline" className="gap-1">
                            <UserX className="h-3 w-3" />
                            Unassigned
                          </Badge>
                        ) : null}
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
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading tickets…</div>}>
      <AccessGate module="helpdeskTickets">{(roleDef) => <TicketsList roleDef={roleDef} />}</AccessGate>
    </Suspense>
  );
}
