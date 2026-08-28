import type {
  B2BCustomerAddress,
  B2BCustomerContact,
  B2BCustomerCredit,
  B2BCustomerDocument,
} from "@/types";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export class B2BCustomerRelatedApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "B2BCustomerRelatedApiError";
  }
}

async function listJson<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new B2BCustomerRelatedApiError(await parseError(res), res.status);
  return (await res.json()) as T[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new B2BCustomerRelatedApiError(await parseError(res), res.status);
  return (await res.json()) as T;
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new B2BCustomerRelatedApiError(await parseError(res), res.status);
}

export function listB2BCustomerContacts(b2bCustomerId: number) {
  return listJson<B2BCustomerContact>(`/api/b2b-customer-contacts?b2bCustomerId=${b2bCustomerId}`);
}
export function createB2BCustomerContact(input: Record<string, unknown>) {
  return postJson<B2BCustomerContact>("/api/b2b-customer-contacts", input);
}
export function deleteB2BCustomerContact(id: number) {
  return del(`/api/b2b-customer-contacts/${id}`);
}

export function listB2BCustomerAddresses(b2bCustomerId: number) {
  return listJson<B2BCustomerAddress>(`/api/b2b-customer-addresses?b2bCustomerId=${b2bCustomerId}`);
}
export function createB2BCustomerAddress(input: Record<string, unknown>) {
  return postJson<B2BCustomerAddress>("/api/b2b-customer-addresses", input);
}
export function deleteB2BCustomerAddress(id: number) {
  return del(`/api/b2b-customer-addresses/${id}`);
}

export function listB2BCustomerDocuments(b2bCustomerId: number) {
  return listJson<B2BCustomerDocument>(`/api/b2b-customer-documents?b2bCustomerId=${b2bCustomerId}`);
}
export function createB2BCustomerDocument(input: Record<string, unknown>) {
  return postJson<B2BCustomerDocument>("/api/b2b-customer-documents", input);
}
export function deleteB2BCustomerDocument(id: number) {
  return del(`/api/b2b-customer-documents/${id}`);
}

export function listB2BCustomerCredits(b2bCustomerId: number) {
  return listJson<B2BCustomerCredit>(`/api/b2b-customer-credits?b2bCustomerId=${b2bCustomerId}`);
}
export function createB2BCustomerCredit(input: Record<string, unknown>) {
  return postJson<B2BCustomerCredit>("/api/b2b-customer-credits", input);
}
export function deleteB2BCustomerCredit(id: number) {
  return del(`/api/b2b-customer-credits/${id}`);
}
