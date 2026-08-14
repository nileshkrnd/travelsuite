/** Date range linking a PropertyContract to a PropertySeason. */
export interface PropertyContractSeasonPeriod {
  id: string;
  propertyContractSeasonPeriodKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  propertyId?: number;
  propertyName?: string;
  propertySeasonId: number;
  seasonCode?: string;
  seasonName?: string;
  /** YYYY-MM-DD */
  fromDate: string;
  /** YYYY-MM-DD */
  toDate: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
