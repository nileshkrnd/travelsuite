/** One bullet point within a content section item. */
export interface ServiceProductContentSectionItemPoint {
  serviceProductContentSectionItemPointId: number;
  pointText: string;
  displayOrder: number;
  isActive: boolean;
}

/** One item within a content section (e.g. a numbered step or a labeled point group). */
export interface ServiceProductContentSectionItem {
  serviceProductContentSectionItemId: number;
  itemTitle: string;
  itemDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  points: ServiceProductContentSectionItemPoint[];
}

/** A typed content section on a Service Product — one "What to Expect"/"Additional Info"/etc block. */
export interface ServiceProductContentSection {
  serviceProductContentSectionId: number;
  serviceProductId: number;
  serviceProductName?: string;
  contentSectionTypeId: number;
  sectionTypeCode?: string;
  sectionTypeName?: string;
  isStepBased?: boolean;
  sectionTitle: string;
  sectionDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  items: ServiceProductContentSectionItem[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
