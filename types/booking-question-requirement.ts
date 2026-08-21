/** Booking-question requirement lookup — Mandatory, Optional, Conditional. */
export interface BookingQuestionRequirement {
  bookingQuestionRequirementId: number;
  tenantId: number | null;
  companyId: number | null;
  requirementCode: string;
  requirementName: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
