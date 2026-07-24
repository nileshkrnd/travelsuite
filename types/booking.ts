import type { Money } from "./money";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  tenantId: string;
  reference: string;
  destination: string;
  status: BookingStatus;
  bookingDate: string;
  travelDate: string;
  amount: Money;
  customerName: string;
  agencyId?: string;
  subAgencyId?: string;
  corporateId?: string;
  supplierId?: string;
}
