export interface PropertyContractChildPolicyAge {
  id: string;
  propertyContractChildPolicyAgeKey: number;
  fromAge: number;
  toAge: number;
  childPolicyTypeId: number;
  childPolicyTypeCode?: string;
  childPolicyTypeName?: string;
  rateValue: number | null;
  isActive: boolean;
}

export interface PropertyContractChildPolicy {
  id: string;
  propertyContractChildPolicyKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  maxChild: number;
  childCountsInOccupancy: boolean;
  isActive: boolean;
  ageBands: PropertyContractChildPolicyAge[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractChildPolicyWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyRoomId?: number | null;
  maxChild: number;
  childCountsInOccupancy?: boolean;
  isActive?: boolean;
  ageBands?: {
    fromAge: number;
    toAge: number;
    childPolicyTypeId: number;
    rateValue?: number | null;
    isActive?: boolean;
  }[];
}
