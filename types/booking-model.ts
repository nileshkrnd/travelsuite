/** Booking model master — Date, Date+Time, Time Slot, Request, Open Date, Multi Day. */
export interface BookingModel {
  bookingModelId: number;
  bookingModelCode: string;
  bookingModelName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
