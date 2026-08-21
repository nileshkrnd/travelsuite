import type { ServiceProductCancellationPolicy, ServiceProductCancellationPolicyRule } from "@/types";

export interface ServiceProductCancellationPolicyRuleRow {
  serviceProductCancellationPolicyRuleId: bigint | number;
  fromDaysBefore: number;
  toDaysBefore: number | null;
  cancellationPolicyTypeId: bigint | number;
  penaltyValue: unknown;
  isActive: boolean;
  policyType?: { cancellationPolicyTypeCode: string; cancellationPolicyTypeName: string } | null;
}

export interface ServiceProductCancellationPolicyRow {
  serviceProductCancellationPolicyId: bigint | number;
  serviceProductId: bigint | number;
  policyCode: string;
  policyName: string;
  serviceProductSupplierId: bigint | number | null;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplierLink?: { supplier: { supplierName: string } } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  rules?: ServiceProductCancellationPolicyRuleRow[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumber(value: unknown): number {
  return Number(value);
}

function toAppRule(row: ServiceProductCancellationPolicyRuleRow): ServiceProductCancellationPolicyRule {
  return {
    serviceProductCancellationPolicyRuleId: Number(row.serviceProductCancellationPolicyRuleId),
    fromDaysBefore: row.fromDaysBefore,
    toDaysBefore: row.toDaysBefore,
    cancellationPolicyTypeId: Number(row.cancellationPolicyTypeId),
    cancellationPolicyTypeCode: row.policyType?.cancellationPolicyTypeCode ?? undefined,
    cancellationPolicyTypeName: row.policyType?.cancellationPolicyTypeName ?? undefined,
    penaltyValue: toNumber(row.penaltyValue),
    isActive: row.isActive,
  };
}

export function toAppServiceProductCancellationPolicy(
  row: ServiceProductCancellationPolicyRow
): ServiceProductCancellationPolicy {
  return {
    serviceProductCancellationPolicyId: Number(row.serviceProductCancellationPolicyId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    policyCode: row.policyCode,
    policyName: row.policyName,
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    supplierName: row.supplierLink?.supplier.supplierName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    isDefault: row.isDefault,
    isActive: row.isActive,
    rules: (row.rules ?? []).map(toAppRule),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
