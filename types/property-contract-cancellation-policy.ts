export interface PropertyContractCancellationPolicyRule {
  id: string;
  propertyContractCancellationPolicyRuleKey: number;
  fromDaysBefore: number;
  toDaysBefore: number | null;
  cancellationPolicyTypeId: number;
  cancellationPolicyTypeCode?: string;
  cancellationPolicyTypeName?: string;
  penaltyValue: number;
  isActive: boolean;
}

export interface PropertyContractCancellationPolicy {
  id: string;
  propertyContractCancellationPolicyKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  policyCode: string;
  policyName: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  propertyContractRatePlanId: number | null;
  ratePlanCode?: string;
  ratePlanName?: string;
  propertySeasonId: number | null;
  seasonCode?: string;
  seasonName?: string;
  isActive: boolean;
  rules: PropertyContractCancellationPolicyRule[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractCancellationPolicyWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  policyCode: string;
  policyName: string;
  propertyRoomId?: number | null;
  propertyContractRatePlanId?: number | null;
  propertySeasonId?: number | null;
  isActive?: boolean;
  rules?: {
    fromDaysBefore: number;
    toDaysBefore?: number | null;
    cancellationPolicyTypeId: number;
    penaltyValue: number;
    isActive?: boolean;
  }[];
}
