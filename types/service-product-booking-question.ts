/** A selectable option for a SINGLE_SELECT/MULTI_SELECT booking question. */
export interface ServiceProductBookingQuestionOption {
  serviceProductBookingQuestionOptionId: number;
  optionCode: string;
  optionName: string;
  displayOrder: number;
  isActive: boolean;
}

/** Conditional-visibility rule: show this question when the parent question's answer matches. */
export interface ServiceProductBookingQuestionRule {
  serviceProductBookingQuestionRuleId: number;
  parentQuestionId: number;
  parentQuestionCode?: string;
  parentQuestionText?: string;
  parentQuestionOptionId: number | null;
  parentQuestionOptionName?: string;
  bookingQuestionOperatorId: number;
  operatorCode?: string;
  operatorName?: string;
  comparisonValue: string | null;
  isActive: boolean;
}

/** A dynamic question asked at booking time for a Service Product (optionally scoped to an Option/Variant). */
export interface ServiceProductBookingQuestion {
  serviceProductBookingQuestionId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  questionCode: string;
  questionText: string;
  bookingQuestionTypeId: number;
  questionTypeCode?: string;
  questionTypeName?: string;
  bookingQuestionRequirementId: number;
  requirementCode?: string;
  requirementName?: string;
  maxLength: number | null;
  displayOrder: number;
  isActive: boolean;
  options: ServiceProductBookingQuestionOption[];
  rules: ServiceProductBookingQuestionRule[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
