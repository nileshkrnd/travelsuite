import { NextResponse } from "next/server";
import { z } from "zod";
import { getHelpdeskDb } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { mergeMailboxCredentials } from "@/lib/helpdesk-credentials";
import { toAppHelpdeskMailbox } from "@/lib/mappers/helpdesk-mailbox.mapper";
import { isValidWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/whatsapp-phone";

const createSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive().optional().nullable(),
    mailboxAddress: z.string().trim().max(200),
    displayName: z.string().trim().max(200).optional().nullable(),
    provider: z.enum(["gmail", "microsoft365", "whatsapp"]),
    isShared: z.boolean().optional(),
    isActive: z.boolean().optional(),
    syncLookbackHours: z.number().int().min(1).max(8760).optional(),
    imapHost: z.string().trim().max(200).optional().nullable(),
    imapPort: z.number().int().min(1).max(65535).optional().nullable(),
    smtpHost: z.string().trim().max(200).optional().nullable(),
    smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
    appPassword: z.string().trim().max(200).optional().nullable(),
    ms365TenantId: z.string().trim().max(100).optional().nullable(),
    ms365ClientId: z.string().trim().max(100).optional().nullable(),
    ms365ClientSecret: z.string().trim().max(500).optional().nullable(),
    waPhoneNumberId: z.string().trim().max(100).optional().nullable(),
    waBusinessAccountId: z.string().trim().max(100).optional().nullable(),
    waAccessToken: z.string().trim().max(2000).optional().nullable(),
    waAppSecret: z.string().trim().max(500).optional().nullable(),
    waVerifyToken: z.string().trim().max(200).optional().nullable(),
    createdBy: z.number().int().positive().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.provider === "whatsapp") {
      if (!isValidWhatsAppPhone(values.mailboxAddress)) {
        ctx.addIssue({
          code: "custom",
          path: ["mailboxAddress"],
          message: "Valid WhatsApp business phone (E.164) is required",
        });
      }
      if (!values.waPhoneNumberId?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["waPhoneNumberId"],
          message: "WhatsApp Phone Number ID is required",
        });
      }
      if (!values.waAccessToken?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["waAccessToken"],
          message: "WhatsApp access token is required",
        });
      }
      if (!values.waVerifyToken?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["waVerifyToken"],
          message: "Webhook verify token is required",
        });
      }
      return;
    }

    if (!z.string().email().safeParse(values.mailboxAddress).success) {
      ctx.addIssue({
        code: "custom",
        path: ["mailboxAddress"],
        message: "Valid email is required",
      });
    }

    if (values.provider === "gmail") {
      if (!values.appPassword?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["appPassword"],
          message: "Gmail App Password is required",
        });
      }
    } else {
      if (!values.ms365TenantId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["ms365TenantId"], message: "Azure tenant ID is required" });
      }
      if (!values.ms365ClientId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["ms365ClientId"], message: "Azure client ID is required" });
      }
      if (!values.ms365ClientSecret?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["ms365ClientSecret"],
          message: "Azure client secret is required",
        });
      }
    }
  });

/** List helpdesk mailboxes for a tenant (secrets never returned). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const provider = searchParams.get("provider")?.trim().toLowerCase() || "";

    if (!tenantIdParam) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }
    const tenantId = Number(tenantIdParam);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
    }

    const db = getHelpdeskDb();
    const rows = await db.helpdeskMailbox.findMany({
      where: {
        tenantId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(provider ? { provider } : {}),
      },
      include: { _count: { select: { tickets: true } } },
      orderBy: [{ isActive: "desc" }, { mailboxAddress: "asc" }],
    });

    return NextResponse.json(rows.map(toAppHelpdeskMailbox));
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Create a support mailbox (Gmail, Microsoft 365, or WhatsApp). */
export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const address =
      data.provider === "whatsapp"
        ? normalizeWhatsAppPhone(data.mailboxAddress)
        : data.mailboxAddress.trim().toLowerCase();

    const providerDefaults =
      data.provider === "gmail"
        ? {
            imapHost: data.imapHost?.trim() || "imap.gmail.com",
            imapPort: data.imapPort ?? 993,
            smtpHost: data.smtpHost?.trim() || "smtp.gmail.com",
            smtpPort: data.smtpPort ?? 465,
          }
        : {
            imapHost: data.imapHost?.trim() || null,
            imapPort: data.imapPort ?? null,
            smtpHost: data.smtpHost?.trim() || null,
            smtpPort: data.smtpPort ?? null,
          };

    const credentialsEnc = mergeMailboxCredentials(null, {
      appPassword: data.appPassword ?? undefined,
      ms365TenantId: data.ms365TenantId ?? undefined,
      ms365ClientId: data.ms365ClientId ?? undefined,
      ms365ClientSecret: data.ms365ClientSecret ?? undefined,
      waPhoneNumberId: data.waPhoneNumberId ?? undefined,
      waBusinessAccountId: data.waBusinessAccountId ?? undefined,
      waAccessToken: data.waAccessToken ?? undefined,
      waAppSecret: data.waAppSecret ?? undefined,
      waVerifyToken: data.waVerifyToken ?? undefined,
    });

    const db = getHelpdeskDb();
    try {
      const created = await db.helpdeskMailbox.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId ?? null,
          mailboxAddress: address,
          displayName: data.displayName?.trim() || address,
          provider: data.provider,
          isShared: data.isShared ?? false,
          isActive: data.isActive ?? true,
          syncLookbackHours: data.syncLookbackHours ?? 720,
          ...providerDefaults,
          credentialsEnc,
          createdBy: data.createdBy ?? null,
        },
        include: { _count: { select: { tickets: true } } },
      });
      return NextResponse.json(toAppHelpdeskMailbox(created), { status: 201 });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          {
            error:
              data.provider === "whatsapp"
                ? "This WhatsApp number is already configured for the tenant"
                : "This mailbox address is already configured for the tenant",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    return dbUnavailable(error);
  }
}
