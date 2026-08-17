import type {
  PropertyContractCancellationPolicy,
  PropertyContractCancellationPolicyRule,
} from "@/types/property-contract-cancellation-policy";
import type { CancellationPolicyType } from "@/types/cancellation-policy-type";

export type CancellationPolicyTypeRow = {
  cancellationPolicyTypeId: number;
  tenantId: number;
  companyId: number;
  cancellationPolicyTypeCode: string;
  cancellationPolicyTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractCancellationPolicyRow = {
  propertyContractCancellationPolicyId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  policyCode: string;
  policyName: string;
  propertyRoomId: number | null;
  propertyContractRatePlanId: number | null;
  propertySeasonId: number | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  roomCode?: string;
  roomName?: string;
  ratePlanCode?: string;
  ratePlanName?: string;
  seasonCode?: string;
  seasonName?: string;
  rules?: {
    propertyContractCancellationPolicyRuleId: number;
    fromDaysBefore: number;
    toDaysBefore: number | null;
    cancellationPolicyTypeId: number;
    cancellationPolicyTypeCode?: string;
    cancellationPolicyTypeName?: string;
    penaltyValue: number;
    isActive: boolean;
  }[];
};

export function toAppCancellationPolicyType(row: CancellationPolicyTypeRow): CancellationPolicyType {
  return {
    id: String(row.cancellationPolicyTypeId),
    cancellationPolicyTypeKey: row.cancellationPolicyTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    cancellationPolicyTypeCode: row.cancellationPolicyTypeCode,
    cancellationPolicyTypeName: row.cancellationPolicyTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractCancellationPolicy(
  row: PropertyContractCancellationPolicyRow
): PropertyContractCancellationPolicy {
  return {
    id: String(row.propertyContractCancellationPolicyId),
    propertyContractCancellationPolicyKey: row.propertyContractCancellationPolicyId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    policyCode: row.policyCode,
    policyName: row.policyName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    propertyContractRatePlanId: row.propertyContractRatePlanId,
    ratePlanCode: row.ratePlanCode,
    ratePlanName: row.ratePlanName,
    propertySeasonId: row.propertySeasonId,
    seasonCode: row.seasonCode,
    seasonName: row.seasonName,
    isActive: row.isActive,
    rules: (row.rules ?? []).map(
      (r): PropertyContractCancellationPolicyRule => ({
        id: String(r.propertyContractCancellationPolicyRuleId),
        propertyContractCancellationPolicyRuleKey: r.propertyContractCancellationPolicyRuleId,
        fromDaysBefore: r.fromDaysBefore,
        toDaysBefore: r.toDaysBefore,
        cancellationPolicyTypeId: r.cancellationPolicyTypeId,
        cancellationPolicyTypeCode: r.cancellationPolicyTypeCode,
        cancellationPolicyTypeName: r.cancellationPolicyTypeName,
        penaltyValue: r.penaltyValue,
        isActive: r.isActive,
      })
    ),
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
