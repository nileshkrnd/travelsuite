/** Cancellation window rule for a Service Product cancellation policy — days-before-departure band + refund/penalty type. */
export interface ServiceProductCancellationPolicyRule {
  serviceProductCancellationPolicyRuleId: number;
  fromDaysBefore: number;
  toDaysBefore: number | null;
  cancellationPolicyTypeId: number;
  cancellationPolicyTypeCode?: string;
  cancellationPolicyTypeName?: string;
  penaltyValue: number;
  isActive: boolean;
}

/** Cancellation policy for a Service Product — optionally scoped to a supplier link, option, or variant. */
export interface ServiceProductCancellationPolicy {
  serviceProductCancellationPolicyId: number;
  serviceProductId: number;
  serviceProductName?: string;
  policyCode: string;
  policyName: string;
  serviceProductSupplierId: number | null;
  supplierName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  isDefault: boolean;
  isActive: boolean;
  rules: ServiceProductCancellationPolicyRule[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
