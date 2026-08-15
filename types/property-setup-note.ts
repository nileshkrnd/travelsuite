/** Operational note logged against a property's commercial-readiness setup. */
export interface PropertySetupNote {
  id: string;
  propertySetupNoteKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  /** Readiness step code this note relates to (e.g. "contractRates"); null = general note. */
  stepCode: string | null;
  note: string;
  priority: "low" | "normal" | "high";
  createdBy: number;
  createdByName: string;
  createdAt: string;
}
