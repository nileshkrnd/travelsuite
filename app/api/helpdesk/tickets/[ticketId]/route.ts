import { NextResponse } from "next/server";
import { Prisma } from "@prisma/helpdesk-client";
import { z } from "zod";
import { getAdminDb, getHelpdeskDb } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const patchSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  assigneeUserId: z.number().int().positive().nullable().optional(),
  modifiedBy: z.number().int().positive().optional(),
});

type RouteContext = { params: Promise<{ ticketId: string }> };

const ticketInclude = {
  mailbox: { select: { mailboxAddress: true } },
  messages: { orderBy: [{ receivedAt: "asc" as const }, { createdDtTm: "asc" as const }] },
  _count: { select: { messages: true } },
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const db = getHelpdeskDb();
    const { ticketId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const row = await db.helpdeskTicket.findUnique({
      where: { ticketId: id.data },
      include: ticketInclude,
    });
    if (!row) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const db = getHelpdeskDb();
    const admin = getAdminDb();
    const { ticketId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data: Prisma.HelpdeskTicketUpdateInput = {
      modifiedDtTm: new Date(),
    };
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.modifiedBy !== undefined) data.modifiedBy = parsed.data.modifiedBy;

    if (parsed.data.departmentId !== undefined) {
      if (parsed.data.departmentId === null) {
        data.departmentId = null;
        data.departmentName = null;
      } else {
        const dept = await admin.department.findUnique({
          where: { departmentId: parsed.data.departmentId },
          select: { departmentId: true, departmentName: true },
        });
        if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 400 });
        data.departmentId = dept.departmentId;
        data.departmentName = dept.departmentName;
      }
    }

    if (parsed.data.assigneeUserId !== undefined) {
      if (parsed.data.assigneeUserId === null) {
        data.assigneeUserId = null;
        data.assigneeName = null;
      } else {
        const employee = await admin.employee.findFirst({
          where: { userId: parsed.data.assigneeUserId },
          select: { firstName: true, lastName: true, userId: true },
        });
        if (employee) {
          data.assigneeUserId = employee.userId;
          data.assigneeName = `${employee.firstName} ${employee.lastName}`.trim();
        } else {
          const user = await admin.user.findUnique({
            where: { userId: parsed.data.assigneeUserId },
            select: { userId: true, userDisplayName: true, username: true },
          });
          if (!user) return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
          data.assigneeUserId = user.userId;
          data.assigneeName = user.userDisplayName || user.username;
        }
      }
    }

    const updated = await db.helpdeskTicket.update({
      where: { ticketId: id.data },
      data,
      include: ticketInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
