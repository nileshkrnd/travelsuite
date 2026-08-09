import { NextResponse } from "next/server";
import { Prisma } from "@prisma/helpdesk-client";
import { getHelpdeskDb } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/** List helpdesk tickets (newest activity first) with reply/open signals. */
export async function GET(request: Request) {
  try {
    const db = getHelpdeskDb();
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const channel = searchParams.get("channel");
    const departmentIdParam = searchParams.get("departmentId");
    const assigneeUserIdParam = searchParams.get("assigneeUserId");

    const where: Prisma.HelpdeskTicketWhereInput = { isActive: true };
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (channel && channel !== "all") where.channel = channel;
    if (departmentIdParam && departmentIdParam !== "all") {
      where.departmentId = Number(departmentIdParam);
    }
    if (assigneeUserIdParam && assigneeUserIdParam !== "all") {
      where.assigneeUserId = Number(assigneeUserIdParam);
    }

    const rows = await db.helpdeskTicket.findMany({
      where,
      include: {
        mailbox: { select: { mailboxAddress: true } },
        _count: { select: { messages: true } },
        messages: {
          where: { OR: [{ isInternal: false }, { direction: { not: "note" } }] },
          orderBy: [{ receivedAt: "desc" }, { createdDtTm: "desc" }],
          take: 1,
          select: {
            direction: true,
            fromName: true,
            fromEmail: true,
            isInternal: true,
            receivedAt: true,
            createdDtTm: true,
          },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdDtTm: "desc" }],
      take: 200,
    });

    const ids = rows.map((r) => r.ticketId);
    const directionCounts =
      ids.length === 0
        ? []
        : await db.helpdeskTicketMessage.groupBy({
            by: ["ticketId", "direction"],
            where: { ticketId: { in: ids } },
            _count: { _all: true },
          });

    const inboundByTicket = new Map<number, number>();
    const outboundByTicket = new Map<number, number>();
    for (const row of directionCounts) {
      if (row.direction === "inbound") inboundByTicket.set(row.ticketId, row._count._all);
      if (row.direction === "outbound") outboundByTicket.set(row.ticketId, row._count._all);
    }

    const enriched = rows.map((row) => {
      const last = row.messages[0] ?? null;
      return {
        ...row,
        messages: undefined,
        lastActivity: last,
        inboundCount: inboundByTicket.get(row.ticketId) ?? 0,
        outboundCount: outboundByTicket.get(row.ticketId) ?? 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return dbUnavailable(error);
  }
}
