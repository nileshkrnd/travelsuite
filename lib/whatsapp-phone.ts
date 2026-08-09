/** Normalize phone numbers for WhatsApp ticketing (E.164-ish). */

export function normalizeWhatsAppPhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus || digits.length > 10 ? `+${digits}` : `+${digits}`;
}

/** Digits only (no +) — Meta WhatsApp "to" field usually wants country code without +. */
export function whatsAppToDigits(input: string): string {
  return normalizeWhatsAppPhone(input).replace(/\D/g, "");
}

export function whatsAppConversationId(customerPhone: string): string {
  return `wa:${whatsAppToDigits(customerPhone)}`;
}

export function isValidWhatsAppPhone(input: string): boolean {
  const digits = whatsAppToDigits(input);
  return digits.length >= 8 && digits.length <= 15;
}
