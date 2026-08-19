/** Classification / sub-category under a Service Type — self-referencing for a hierarchy (e.g. Hotel > Resort > Beach Resort). */
export interface ServiceProductClassification {
  serviceProductClassificationId: number;
  serviceTypeId: number;
  serviceTypeName?: string;
  classificationCode: string;
  classificationName: string;
  parentClassificationId: number | null;
  parentClassificationName?: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  companyName?: string;
}
