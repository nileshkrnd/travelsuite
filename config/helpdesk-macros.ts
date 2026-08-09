/** Starter reply macros for helpdesk Ops MVP. Variables: {{requesterName}}, {{ticketNumber}}, {{agentName}}, {{subject}} */
export type HelpdeskMacro = {
  id: string;
  label: string;
  body: string;
};

export const HELPDESK_MACROS: HelpdeskMacro[] = [
  {
    id: "ack",
    label: "Acknowledge request",
    body: `Hi {{requesterName}},

Thank you for contacting us regarding {{ticketNumber}}. We have received your request and our team is reviewing it.

We will get back to you shortly.

Best regards,
{{agentName}}`,
  },
  {
    id: "need-info",
    label: "Need more information",
    body: `Hi {{requesterName}},

Thank you for your message on {{ticketNumber}}. To proceed, could you please share a few more details?

- Booking / PNR reference (if any)
- Preferred dates or deadline
- Any additional context that would help us assist you

Once we have this, we will continue right away.

Best regards,
{{agentName}}`,
  },
  {
    id: "looking-into",
    label: "Looking into it",
    body: `Hi {{requesterName}},

We are looking into your request ({{ticketNumber}}) and will update you as soon as we have more information.

Thank you for your patience.

Best regards,
{{agentName}}`,
  },
  {
    id: "resolved",
    label: "Resolved confirmation",
    body: `Hi {{requesterName}},

We believe your request {{ticketNumber}} has been resolved. If anything else is needed, just reply to this email and we will reopen the conversation.

Best regards,
{{agentName}}`,
  },
  {
    id: "booking-change",
    label: "Booking change received",
    body: `Hi {{requesterName}},

We have received your booking change request for {{ticketNumber}}. Our operations team is checking availability and any fare differences.

We will confirm the options with you before making changes.

Best regards,
{{agentName}}`,
  },
  {
    id: "refund",
    label: "Refund under review",
    body: `Hi {{requesterName}},

Your refund request ({{ticketNumber}}) is under review. Processing times depend on the supplier and payment method; we will update you once we have a clear timeline.

Best regards,
{{agentName}}`,
  },
  {
    id: "delay-update",
    label: "Delay / apology update",
    body: `Hi {{requesterName}},

Apologies for the delay in getting back to you on {{ticketNumber}}. We are still working on this and will share an update as soon as possible.

Thank you for your patience.

Best regards,
{{agentName}}`,
  },
  {
    id: "closing",
    label: "Closing — no further action",
    body: `Hi {{requesterName}},

As we have not heard back, we are closing ticket {{ticketNumber}} for now. If you still need help, reply to this email and we will be happy to assist.

Best regards,
{{agentName}}`,
  },
];

export function applyHelpdeskMacro(
  template: string,
  vars: {
    requesterName?: string | null;
    ticketNumber?: string | null;
    agentName?: string | null;
    subject?: string | null;
  }
): string {
  return template
    .replaceAll("{{requesterName}}", vars.requesterName?.trim() || "there")
    .replaceAll("{{ticketNumber}}", vars.ticketNumber?.trim() || "your ticket")
    .replaceAll("{{agentName}}", vars.agentName?.trim() || "Support")
    .replaceAll("{{subject}}", vars.subject?.trim() || "your request");
}
