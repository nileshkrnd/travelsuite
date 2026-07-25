export type ReferenceStatus = "active" | "inactive";

/** Global Country master (not tenant/company scoped). */
export interface Country {
  id: string;
  countryKey: number;
  code: string;
  name: string;
  dialCode: string;
  status: ReferenceStatus;
  createdAt: string;
}
