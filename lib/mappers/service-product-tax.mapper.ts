import type { ServiceProductTax } from "@/types";

export interface ServiceProductTaxRow {
  serviceProductTaxId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductSupplierId: bigint | number | null;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  taxId: bigint | number;
  taxName: string;
  taxCalculationTypeId: bigint | number;
  taxRate: unknown;
  taxAmount: unknown;
  taxApplicationBasisId: bigint | number;
  isInclusive: boolean;
  isCompound: boolean;
  sequenceNo: number;
  fromDate: Date | string;
  toDate: Date | string | null;
  isActive: boolean;
  remarks: string | null;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplierLink?: { supplier: { supplierName: string } } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  tax?: { taxCode: string } | null;
  taxCalculationType?: { taxCalculationTypeCode: string; taxCalculationTypeName: string } | null;
  taxApplicationBasis?: { taxApplicationBasisCode: string; taxApplicationBasisName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toAppServiceProductTax(row: ServiceProductTaxRow): ServiceProductTax {
  return {
    serviceProductTaxId: Number(row.serviceProductTaxId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    supplierName: row.supplierLink?.supplier.supplierName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    taxId: Number(row.taxId),
    taxCode: row.tax?.taxCode ?? undefined,
    taxName: row.taxName,
    taxCalculationTypeId: Number(row.taxCalculationTypeId),
    taxCalculationTypeCode: row.taxCalculationType?.taxCalculationTypeCode ?? undefined,
    taxCalculationTypeName: row.taxCalculationType?.taxCalculationTypeName ?? undefined,
    taxRate: toNumberOrNull(row.taxRate),
    taxAmount: toNumberOrNull(row.taxAmount),
    taxApplicationBasisId: Number(row.taxApplicationBasisId),
    taxApplicationBasisCode: row.taxApplicationBasis?.taxApplicationBasisCode ?? undefined,
    taxApplicationBasisName: row.taxApplicationBasis?.taxApplicationBasisName ?? undefined,
    isInclusive: row.isInclusive,
    isCompound: row.isCompound,
    sequenceNo: row.sequenceNo,
    fromDate: toDateOnly(row.fromDate) ?? "",
    toDate: toDateOnly(row.toDate),
    isActive: row.isActive,
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
