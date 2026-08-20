import type { ServiceProductRate } from "@/types";

export interface ServiceProductRateRow {
  serviceProductRateId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductSupplierId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  serviceProductScheduleId: bigint | number | null;
  rateTypeId: bigint | number;
  minimumPax: number | null;
  maximumPax: number | null;
  minimumQuantity: { toString(): string } | number | string | null;
  maximumQuantity: { toString(): string } | number | string | null;
  rateAmount: { toString(): string } | number | string;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplierLink?: { supplier: { supplierName: string } } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  rateType?: { rateTypeName: string } | null;
  commonStatus?: { statusName: string } | null;
  days?: { dayOfWeekId: bigint | number; isActive: boolean; dayOfWeek?: { dayOfWeekName: string } | null }[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

function toNumber(value: { toString(): string } | number | string): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function toNumberOrNull(value: { toString(): string } | number | string | null): number | null {
  if (value == null) return null;
  return toNumber(value);
}

export function toAppServiceProductRate(row: ServiceProductRateRow): ServiceProductRate {
  return {
    serviceProductRateId: Number(row.serviceProductRateId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductSupplierId: Number(row.serviceProductSupplierId),
    supplierName: row.supplierLink?.supplier.supplierName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    serviceProductScheduleId: row.serviceProductScheduleId != null ? Number(row.serviceProductScheduleId) : null,
    rateTypeId: Number(row.rateTypeId),
    rateTypeName: row.rateType?.rateTypeName ?? undefined,
    minimumPax: row.minimumPax,
    maximumPax: row.maximumPax,
    minimumQuantity: toNumberOrNull(row.minimumQuantity),
    maximumQuantity: toNumberOrNull(row.maximumQuantity),
    rateAmount: toNumber(row.rateAmount),
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    days: (row.days ?? []).map((d) => ({
      dayOfWeekId: Number(d.dayOfWeekId),
      dayOfWeekName: d.dayOfWeek?.dayOfWeekName ?? undefined,
      isActive: d.isActive,
    })),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
