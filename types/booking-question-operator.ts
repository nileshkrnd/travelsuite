/** Comparison operator lookup for booking-question conditional rules — Equals, Contains, Greater than, … */
export interface BookingQuestionOperator {
  bookingQuestionOperatorId: number;
  tenantId: number | null;
  companyId: number | null;
  operatorCode: string;
  operatorName: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
