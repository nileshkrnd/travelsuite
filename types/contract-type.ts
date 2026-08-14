/** Contract Type lookup — global (FIT, Group, Corporate, …). */
export interface ContractType {
  id: string;
  contractTypeKey: number;
  name: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
