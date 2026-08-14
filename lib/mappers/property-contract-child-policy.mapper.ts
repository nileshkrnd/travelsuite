import type {
  PropertyContractChildPolicy,
  PropertyContractChildPolicyAge,
} from "@/types/property-contract-child-policy";
import type { ChildPolicyType } from "@/types/child-policy-type";

export type ChildPolicyTypeRow = {
  childPolicyTypeId: number;
  tenantId: number;
  companyId: number;
  childPolicyTypeCode: string;
  childPolicyTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractChildPolicyRow = {
  propertyContractChildPolicyId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyRoomId: number | null;
  maxChild: number;
  childCountsInOccupancy: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  roomCode?: string;
  roomName?: string;
  ageBands?: {
    propertyContractChildPolicyAgeId: number;
    fromAge: number;
    toAge: number;
    childPolicyTypeId: number;
    childPolicyTypeCode?: string;
    childPolicyTypeName?: string;
    rateValue: number | null;
    isActive: boolean;
  }[];
};

export function toAppChildPolicyType(row: ChildPolicyTypeRow): ChildPolicyType {
  return {
    id: String(row.childPolicyTypeId),
    childPolicyTypeKey: row.childPolicyTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    childPolicyTypeCode: row.childPolicyTypeCode,
    childPolicyTypeName: row.childPolicyTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractChildPolicy(
  row: PropertyContractChildPolicyRow
): PropertyContractChildPolicy {
  return {
    id: String(row.propertyContractChildPolicyId),
    propertyContractChildPolicyKey: row.propertyContractChildPolicyId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    maxChild: row.maxChild,
    childCountsInOccupancy: row.childCountsInOccupancy,
    isActive: row.isActive,
    ageBands: (row.ageBands ?? []).map(
      (a): PropertyContractChildPolicyAge => ({
        id: String(a.propertyContractChildPolicyAgeId),
        propertyContractChildPolicyAgeKey: a.propertyContractChildPolicyAgeId,
        fromAge: a.fromAge,
        toAge: a.toAge,
        childPolicyTypeId: a.childPolicyTypeId,
        childPolicyTypeCode: a.childPolicyTypeCode,
        childPolicyTypeName: a.childPolicyTypeName,
        rateValue: a.rateValue,
        isActive: a.isActive,
      })
    ),
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
