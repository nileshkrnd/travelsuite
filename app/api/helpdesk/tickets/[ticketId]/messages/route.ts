import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb, getHelpdeskDb } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { sendHelpdeskOutboundEmail } from "@/lib/services/helpdesk-email-send.service";

const idSchema = z.coerce.number().int().positive();
const bodySchema = z.object({
  kind: z.enum(["reply", "note"]),
  bodyText: z.string().trim().min(1, "Message body is required").max(50000),
  bodyHtml: z.string().trim().max(100000).optional().nullable(),
  createdBy: z.number().int().positive().optional(),
});

type RouteContext = { params: Promise<{ ticketId: string }> };

const ticketInclude = {
  mailbox: { select: { mailboxAddress: true } },
  messages: { orderBy: [{ receivedAt: "asc" as const }, { createdDtTm: "asc" as const }] },
  _count: { select: { messages: true } },
};

function replySubject(subject: string): string {
  const s = subject.trim() || "(no subject)";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const db = getHelpdeskDb();
    const admin = getAdminDb();
    const { ticketId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const ticket = await db.helpdeskTicket.findUnique({ where: { ticketId: id.data } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const now = new Date();
    const bodyText = parsed.data.bodyText;
    const bodyHtml = parsed.data.bodyHtml?.trim() || null;
    const preview = bodyText.slice(0, 1000);

    let agentName: string | null = null;
    let agentEmail: string | null = null;
    if (parsed.data.createdBy) {
      const employee = await admin.employee.findFirst({
        where: { userId: parsed.data.createdBy },
        select: { firstName: true, lastName: true, email: true },
      });
      if (employee) {
        agentName = `${employee.firstName} ${employee.lastName}`.trim();
        agentEmail = employee.email;
      } else {
        const user = await admin.user.findUnique({
          where: { userId: parsed.data.createdBy },
          select: { userDisplayName: true, email: true },
        });
        agentName = user?.userDisplayName ?? null;
        agentEmail = user?.email ?? null;
      }
    }

    if (parsed.data.kind === "note") {
      await db.helpdeskTicketMessage.create({
        data: {
          ticketId: ticket.ticketId,
          direction: "note",
          isInternal: true,
          createdBy: parsed.data.createdBy ?? null,
          fromName: agentName,
          fromEmail: agentEmail,
          subject: ticket.subject,
          bodyPreview: preview,
          bodyHtml,
          bodyText,
          receivedAt: now,
        },
      });
      await db.helpdeskTicket.update({
        where: { ticketId: ticket.ticketId },
        data: { modifiedDtTm: now, modifiedBy: parsed.data.createdBy ?? null },
      });
    } else {
      if (!ticket.requesterEmail) {
        return NextResponse.json(
          { error: "Ticket has no requester email — cannot send reply" },
          { status: 400 }
        );
      }

      const lastInbound = await db.helpdeskTicketMessage.findFirst({
        where: { ticketId: ticket.ticketId, direction: "inbound" },
        orderBy: { receivedAt: "desc" },
        select: { internetMessageId: true },
      });

      const subject = replySubject(ticket.subject);
      let sentMessageId: string | null = null;
      let fromEmail = process.env.GMAIL_USER?.trim().toLowerCase() || agentEmail;

      try {
        const sent = await sendHelpdeskOutboundEmail({
          to: ticket.requesterEmail,
          subject,
          text: bodyText,
          html: bodyHtml,
          inReplyTo: lastInbound?.internetMessageId
            ? `<${lastInbound.internetMessageId.replace(/^<|>$/g, "")}>`
            : null,
          references: lastInbound?.internetMessageId
            ? `<${lastInbound.internetMessageId.replace(/^<|>$/g, "")}>`
            : null,
          mailboxId: ticket.mailboxId,
        });
        sentMessageId = sent.messageId;
        fromEmail = sent.from;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send email";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      await db.helpdeskTicketMessage.create({
        data: {
          ticketId: ticket.ticketId,
          graphMessageId: sentMessageId ? `smtp:${sentMessageId}` : `smtp-local:${ticket.ticketId}:${now.getTime()}`,
          internetMessageId: sentMessageId,
          direction: "outbound",
          isInternal: false,
          createdBy: parsed.data.createdBy ?? null,
          fromName: agentName || fromEmail,
          fromEmail,
          toEmails: ticket.requesterEmail,
          subject,
          bodyPreview: preview,
          bodyHtml,
          bodyText,
          receivedAt: now,
        },
      });

      await db.helpdeskTicket.update({
        where: { ticketId: ticket.ticketId },
        data: {
          lastMessageAt: now,
          status: ticket.status === "open" ? "pending" : ticket.status,
          modifiedDtTm: now,
          modifiedBy: parsed.data.createdBy ?? null,
        },
      });
    }

    const refreshed = await db.helpdeskTicket.findUnique({
      where: { ticketId: ticket.ticketId },
      include: ticketInclude,
    });
    return NextResponse.json(refreshed, { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
