/** Contract Status lookup — global (Draft, Active, Expired, …). */
export interface ContractStatus {
  id: string;
  contractStatusKey: number;
  name: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
