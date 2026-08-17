export interface PropertyContractSupplementPeriod {
  id: string;
  propertyContractSupplementPeriodKey: number;
  fromDate: string;
  toDate: string;
  isMandatory: boolean;
  isActive: boolean;
}

export interface PropertyContractSupplementAge {
  id: string;
  propertyContractSupplementAgeKey: number;
  fromAge: number;
  toAge: number;
  rateBasisId: number;
  rateBasisCode?: string;
  rateBasisName?: string;
  /** Currency amount, or a 0-100 percentage of the adult rate when isPercentOfAdultRate is true. */
  amount: number;
  isPercentOfAdultRate: boolean;
  isFree: boolean;
  isActive: boolean;
}

export interface PropertyContractSupplementRatePlan {
  id: string;
  propertyContractSupplementRatePlanKey: number;
  propertyContractRatePlanId: number;
  ratePlanCode?: string;
  ratePlanName?: string;
  amount: number;
  isActive: boolean;
}

export interface PropertyContractSupplement {
  id: string;
  propertyContractSupplementKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  supplementTypeId: number;
  supplementTypeCode?: string;
  supplementTypeName?: string;
  supplementCode: string;
  supplementName: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  rateBasisId: number;
  rateBasisCode?: string;
  rateBasisName?: string;
  amount: number;
  isMandatory: boolean;
  isActive: boolean;
  displayOrder: number;
  dayOfWeekIds: number[];
  periods: PropertyContractSupplementPeriod[];
  ageBands: PropertyContractSupplementAge[];
  ratePlans: PropertyContractSupplementRatePlan[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractSupplementWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  supplementTypeId: number;
  supplementCode: string;
  supplementName: string;
  propertyRoomId?: number | null;
  rateBasisId: number;
  amount: number;
  isMandatory?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  dayOfWeekIds?: number[];
  periods?: {
    fromDate: string;
    toDate: string;
    isMandatory?: boolean;
    isActive?: boolean;
  }[];
  ageBands?: {
    fromAge: number;
    toAge: number;
    rateBasisId: number;
    amount: number;
    isPercentOfAdultRate?: boolean;
    isFree?: boolean;
    isActive?: boolean;
  }[];
  ratePlans?: {
    propertyContractRatePlanId: number;
    amount: number;
    isActive?: boolean;
  }[];
}
