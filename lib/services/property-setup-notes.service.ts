import type { PropertySetupNote } from "@/types";

export class PropertySetupNotesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertySetupNotesApiError";
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

export async function listPropertySetupNotes(propertyId: number): Promise<PropertySetupNote[]> {
  const res = await fetch(`/api/property-setup-notes?propertyId=${propertyId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySetupNotesApiError(await parseError(res), res.status);
  return (await res.json()) as PropertySetupNote[];
}

export interface CreatePropertySetupNoteInput {
  tenantId: number;
  companyId: number;
  propertyId: number;
  stepCode?: string | null;
  note: string;
  priority?: "low" | "normal" | "high";
  createdBy: number;
}

export async function createPropertySetupNote(
  input: CreatePropertySetupNoteInput
): Promise<PropertySetupNote> {
  const res = await fetch("/api/property-setup-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySetupNotesApiError(await parseError(res), res.status);
  return (await res.json()) as PropertySetupNote;
}
