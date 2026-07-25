import type { ReferenceStatus } from "./country";

/** Global City master — belongs to a Country only. */
export interface City {
  id: string;
  cityKey: number;
  countryKey: number;
  countryCode: string;
  code: string;
  name: string;
  status: ReferenceStatus;
  createdAt: string;
}
