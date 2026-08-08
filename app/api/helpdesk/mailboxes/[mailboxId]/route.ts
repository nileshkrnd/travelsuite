import { NextResponse } from "next/server";
import { z } from "zod";
import { getHelpdeskDb } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { mergeMailboxCredentials } from "@/lib/helpdesk-credentials";
import { toAppHelpdeskMailbox } from "@/lib/mappers/helpdesk-mailbox.mapper";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  companyId: z.number().int().positive().optional().nullable(),
  mailboxAddress: z.string().trim().email().max(200).optional(),
  displayName: z.string().trim().max(200).optional().nullable(),
  provider: z.enum(["gmail", "microsoft365"]).optional(),
  isShared: z.boolean().optional(),
  isActive: z.boolean().optional(),
  syncLookbackHours: z.number().int().min(1).max(8760).optional(),
  imapHost: z.string().trim().max(200).optional().nullable(),
  imapPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpHost: z.string().trim().max(200).optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  /** Leave blank to keep existing secret. */
  appPassword: z.string().trim().max(200).optional().nullable(),
  ms365TenantId: z.string().trim().max(100).optional().nullable(),
  ms365ClientId: z.string().trim().max(100).optional().nullable(),
  ms365ClientSecret: z.string().trim().max(500).optional().nullable(),
  modifiedBy: z.number().int().positive().optional(),
});

type RouteContext = { params: Promise<{ mailboxId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { mailboxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid mailbox id" }, { status: 400 });

    const db = getHelpdeskDb();
    const row = await db.helpdeskMailbox.findUnique({
      where: { mailboxId: id.data },
      include: { _count: { select: { tickets: true } } },
    });
    if (!row) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
    return NextResponse.json(toAppHelpdeskMailbox(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { mailboxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid mailbox id" }, { status: 400 });

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const db = getHelpdeskDb();
    const existing = await db.helpdeskMailbox.findUnique({ where: { mailboxId: id.data } });
    if (!existing) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

    const data = parsed.data;
    const provider = data.provider ?? existing.provider;
    const nextAddress = data.mailboxAddress
      ? data.mailboxAddress.trim().toLowerCase()
      : existing.mailboxAddress;

    const credentialsEnc = mergeMailboxCredentials(existing.credentialsEnc, {
      appPassword: data.appPassword ?? undefined,
      ms365TenantId: data.ms365TenantId ?? undefined,
      ms365ClientId: data.ms365ClientId ?? undefined,
      ms365ClientSecret: data.ms365ClientSecret ?? undefined,
    });

    try {
      const updated = await db.helpdeskMailbox.update({
        where: { mailboxId: id.data },
        data: {
          companyId: data.companyId === undefined ? undefined : data.companyId,
          mailboxAddress: nextAddress,
          displayName:
            data.displayName === undefined
              ? undefined
              : data.displayName?.trim() || nextAddress,
          provider,
          isShared: data.isShared,
          isActive: data.isActive,
          syncLookbackHours: data.syncLookbackHours,
          imapHost: data.imapHost === undefined ? undefined : data.imapHost?.trim() || null,
          imapPort: data.imapPort === undefined ? undefined : data.imapPort,
          smtpHost: data.smtpHost === undefined ? undefined : data.smtpHost?.trim() || null,
          smtpPort: data.smtpPort === undefined ? undefined : data.smtpPort,
          credentialsEnc,
          modifiedBy: data.modifiedBy ?? null,
          modifiedDtTm: new Date(),
        },
        include: { _count: { select: { tickets: true } } },
      });
      return NextResponse.json(toAppHelpdeskMailbox(updated));
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "This mailbox address is already configured for the tenant" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { mailboxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid mailbox id" }, { status: 400 });

    const body = z
      .object({
        isActive: z.boolean(),
        modifiedBy: z.number().int().positive().optional(),
      })
      .safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const db = getHelpdeskDb();
    const updated = await db.helpdeskMailbox.update({
      where: { mailboxId: id.data },
      data: {
        isActive: body.data.isActive,
        modifiedBy: body.data.modifiedBy ?? null,
        modifiedDtTm: new Date(),
      },
      include: { _count: { select: { tickets: true } } },
    });
    return NextResponse.json(toAppHelpdeskMailbox(updated));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { mailboxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid mailbox id" }, { status: 400 });

    const db = getHelpdeskDb();
    await db.helpdeskMailbox.delete({ where: { mailboxId: id.data } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return dbUnavailable(error);
  }
}
