import nodemailer from "nodemailer";
import { getHelpdeskDb } from "@/lib/db";
import { decryptMailboxCredentials } from "@/lib/helpdesk-credentials";

export type OutboundMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  /** Prefer sending from this helpdesk mailbox row. */
  mailboxId?: number | null;
};

/** Send outbound mail from a configured mailbox (or .env Gmail fallback). */
export async function sendHelpdeskOutboundEmail(input: OutboundMailInput): Promise<{
  from: string;
  messageId: string | null;
}> {
  let user = "";
  let pass = "";
  let host = "smtp.gmail.com";
  let port = 465;

  if (input.mailboxId) {
    const db = getHelpdeskDb();
    const box = await db.helpdeskMailbox.findUnique({ where: { mailboxId: input.mailboxId } });
    if (!box) throw new Error("Outbound mailbox not found");
    if (box.provider !== "gmail") {
      throw new Error("Outbound reply currently supports Gmail mailboxes only");
    }
    const creds = decryptMailboxCredentials(box.credentialsEnc);
    user = box.mailboxAddress.toLowerCase();
    pass = (creds.appPassword || "").replace(/\s+/g, "");
    host = (box.smtpHost || "smtp.gmail.com").trim();
    port = Number(box.smtpPort || 465);
  } else {
    user = (process.env.GMAIL_USER || "").trim().toLowerCase();
    pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
    host = (process.env.GMAIL_SMTP_HOST || "smtp.gmail.com").trim();
    port = Number(process.env.GMAIL_SMTP_PORT || 465);
  }

  if (!user || !pass) {
    throw new Error("Missing mailbox credentials for outbound email — configure Helpdesk Mailboxes");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 465,
    secure: true,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: user,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html || undefined,
    headers: {
      ...(input.inReplyTo ? { "In-Reply-To": input.inReplyTo } : {}),
      ...(input.references ? { References: input.references } : {}),
    },
  });

  return {
    from: user,
    messageId: typeof info.messageId === "string" ? info.messageId : null,
  };
}
