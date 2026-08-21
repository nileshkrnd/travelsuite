/** Booking-question answer-type lookup — Text, Number, Date, Single select, File, … */
export interface BookingQuestionType {
  bookingQuestionTypeId: number;
  tenantId: number | null;
  companyId: number | null;
  questionTypeCode: string;
  questionTypeName: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
