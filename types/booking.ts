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
  agentId?: string;
  subAgentId?: string;
  hotelierId?: string;
  supplierId?: string;
  dmcId?: string;
  corporateId?: string;
}
