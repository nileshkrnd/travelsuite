import type { Prisma, PrismaClient } from "@prisma/client";

/** Two date ranges overlap when open ends are treated as unbounded. */
export function dateRangesOverlap(aFrom: Date | null, aTo: Date | null, bFrom: Date | null, bTo: Date | null): boolean {
  const aStart = aFrom ?? new Date("0000-01-01T00:00:00.000Z");
  const aEnd = aTo ?? new Date("9999-12-31T00:00:00.000Z");
  const bStart = bFrom ?? new Date("0000-01-01T00:00:00.000Z");
  const bEnd = bTo ?? new Date("9999-12-31T00:00:00.000Z");
  return aStart <= bEnd && bStart <= aEnd;
}

export interface RateBusinessRuleInput {
  validFrom: Date | null;
  validTo: Date | null;
  minimumPax: number | null | undefined;
  maximumPax: number | null | undefined;
  minimumQuantity: number | null | undefined;
  maximumQuantity: number | null | undefined;
}

/** Returns an error message if a cross-field business rule is violated, otherwise null. */
export function validateRateBusinessRules(data: RateBusinessRuleInput): string | null {
  if (data.validFrom && data.validTo && data.validFrom > data.validTo) {
    return "Valid to must be on or after valid from";
  }
  if (data.minimumPax != null && data.maximumPax != null && data.minimumPax > data.maximumPax) {
    return "Max pax must be greater than or equal to min pax";
  }
  if (data.minimumQuantity != null && data.maximumQuantity != null && data.minimumQuantity > data.maximumQuantity) {
    return "Max quantity must be greater than or equal to min quantity";
  }
  return null;
}

export interface DuplicateRateCheckInput {
  serviceProductId: bigint;
  serviceProductSupplierId: bigint;
  rateTypeId: bigint;
  serviceProductOptionId: bigint | null;
  serviceProductVariantId: bigint | null;
  serviceProductScheduleId: bigint | null;
  validFrom: Date | null;
  validTo: Date | null;
  excludeRateId?: bigint;
}

/** Finds an existing rate with the same type/scope whose valid date range overlaps, if any. */
export async function findDuplicateRate(
  client: Pick<PrismaClient, "serviceProductRate">,
  input: DuplicateRateCheckInput
): Promise<boolean> {
  const where: Prisma.ServiceProductRateWhereInput = {
    serviceProductId: input.serviceProductId,
    serviceProductSupplierId: input.serviceProductSupplierId,
    rateTypeId: input.rateTypeId,
    serviceProductOptionId: input.serviceProductOptionId,
    serviceProductVariantId: input.serviceProductVariantId,
    serviceProductScheduleId: input.serviceProductScheduleId,
  };
  if (input.excludeRateId != null) {
    where.serviceProductRateId = { not: input.excludeRateId };
  }

  const candidates = await client.serviceProductRate.findMany({
    where,
    select: { validFrom: true, validTo: true },
  });

  return candidates.some((c) => dateRangesOverlap(c.validFrom, c.validTo, input.validFrom, input.validTo));
}
