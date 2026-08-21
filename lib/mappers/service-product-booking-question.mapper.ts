import type {
  ServiceProductBookingQuestion,
  ServiceProductBookingQuestionOption,
  ServiceProductBookingQuestionRule,
} from "@/types";

export interface ServiceProductBookingQuestionOptionRow {
  serviceProductBookingQuestionOptionId: bigint | number;
  optionCode: string;
  optionName: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ServiceProductBookingQuestionRuleRow {
  serviceProductBookingQuestionRuleId: bigint | number;
  parentQuestionId: bigint | number;
  parentQuestionOptionId: bigint | number | null;
  bookingQuestionOperatorId: bigint | number;
  comparisonValue: string | null;
  isActive: boolean;
  parentQuestion?: { questionCode: string; questionText: string } | null;
  parentQuestionOption?: { optionName: string } | null;
  operator?: { operatorCode: string; operatorName: string } | null;
}

export interface ServiceProductBookingQuestionRow {
  serviceProductBookingQuestionId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  questionCode: string;
  questionText: string;
  bookingQuestionTypeId: bigint | number;
  bookingQuestionRequirementId: bigint | number;
  maxLength: number | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  serviceProductOption?: { optionName: string } | null;
  serviceProductVariant?: { variantName: string } | null;
  questionType?: { questionTypeCode: string; questionTypeName: string } | null;
  requirement?: { requirementCode: string; requirementName: string } | null;
  options?: ServiceProductBookingQuestionOptionRow[];
  rules?: ServiceProductBookingQuestionRuleRow[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toAppOption(row: ServiceProductBookingQuestionOptionRow): ServiceProductBookingQuestionOption {
  return {
    serviceProductBookingQuestionOptionId: Number(row.serviceProductBookingQuestionOptionId),
    optionCode: row.optionCode,
    optionName: row.optionName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

function toAppRule(row: ServiceProductBookingQuestionRuleRow): ServiceProductBookingQuestionRule {
  return {
    serviceProductBookingQuestionRuleId: Number(row.serviceProductBookingQuestionRuleId),
    parentQuestionId: Number(row.parentQuestionId),
    parentQuestionCode: row.parentQuestion?.questionCode ?? undefined,
    parentQuestionText: row.parentQuestion?.questionText ?? undefined,
    parentQuestionOptionId: row.parentQuestionOptionId != null ? Number(row.parentQuestionOptionId) : null,
    parentQuestionOptionName: row.parentQuestionOption?.optionName ?? undefined,
    bookingQuestionOperatorId: Number(row.bookingQuestionOperatorId),
    operatorCode: row.operator?.operatorCode ?? undefined,
    operatorName: row.operator?.operatorName ?? undefined,
    comparisonValue: row.comparisonValue,
    isActive: row.isActive,
  };
}

export function toAppServiceProductBookingQuestion(
  row: ServiceProductBookingQuestionRow
): ServiceProductBookingQuestion {
  return {
    serviceProductBookingQuestionId: Number(row.serviceProductBookingQuestionId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.serviceProductOption?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.serviceProductVariant?.variantName ?? undefined,
    questionCode: row.questionCode,
    questionText: row.questionText,
    bookingQuestionTypeId: Number(row.bookingQuestionTypeId),
    questionTypeCode: row.questionType?.questionTypeCode ?? undefined,
    questionTypeName: row.questionType?.questionTypeName ?? undefined,
    bookingQuestionRequirementId: Number(row.bookingQuestionRequirementId),
    requirementCode: row.requirement?.requirementCode ?? undefined,
    requirementName: row.requirement?.requirementName ?? undefined,
    maxLength: row.maxLength,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    options: (row.options ?? []).map(toAppOption),
    rules: (row.rules ?? []).map(toAppRule),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
