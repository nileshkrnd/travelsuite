import { toAppPaymentTerm, type PaymentTermRow } from "@/lib/mappers/payment-term.mapper";
import type { PaymentTerm } from "@/types";

export class PaymentTermsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PaymentTermsApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listPaymentTerms(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<PaymentTerm[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/payment-terms${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PaymentTermsApiError(await parseError(res), res.status);
  return ((await res.json()) as PaymentTermRow[]).map(toAppPaymentTerm);
}
