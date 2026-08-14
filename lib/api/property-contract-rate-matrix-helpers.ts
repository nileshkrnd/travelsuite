import { prisma } from "@/lib/db";
import { listDayOfWeekRows, loadRateDayIdsByRate, replacePropertyContractRateDays } from "@/lib/api/day-of-week-helpers";
import type { PropertyContractRateMatrixPayload } from "@/types/property-contract-rate-matrix";

const OCCUPANCY_CODES = ["SINGLE", "DOUBLE", "TRIPLE"] as const;

function toDateOnly(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

function formatMealPlanLabel(code: string, name: string) {
  const upper = code.toUpperCase();
  const labels: Record<string, string> = {
    RO: "ROOM ONLY (RO)",
    BB: "BED & BREAKFAST (BB)",
    HB: "HALF BOARD (HB)",
    FB: "FULL BOARD (FB)",
    AI: "ALL INCLUSIVE (AI)",
  };
  return labels[upper] ?? `${name.toUpperCase()} (${upper})`;
}

export async function loadPropertyContractRateMatrix(input: {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  ratePlanTypeId: number;
}): Promise<PropertyContractRateMatrixPayload> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(input.propertyContractId) },
    include: { currency: { select: { currencyCode: true } } },
  });
  if (!contract) throw new Error("NOT_FOUND:Contract not found");

  const seasonPeriod = await prisma.propertyContractSeasonPeriod.findUnique({
    where: { propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId) },
    include: { propertySeason: { select: { seasonCode: true, seasonName: true } } },
  });
  if (
    !seasonPeriod ||
    seasonPeriod.propertyContractId !== BigInt(input.propertyContractId)
  ) {
    throw new Error("NOT_FOUND:Season period not found for this contract");
  }

  const ratePlans = await prisma.propertyContractRatePlan.findMany({
    where: {
      propertyContractId: BigInt(input.propertyContractId),
      ratePlanTypeId: BigInt(input.ratePlanTypeId),
      isActive: true,
    },
    include: {
      mealPlan: { select: { mealPlanId: true, mealPlanCode: true, mealPlanName: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { ratePlanCode: "asc" }],
  });

  const rooms = await prisma.propertyRoom.findMany({
    where: { tenantId: contract.tenantId, propertyId: contract.propertyId, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { roomName: "asc" }],
    select: { propertyRoomId: true, roomCode: true, roomName: true, displayOrder: true },
  });

  const occupancies = await prisma.occupancyType.findMany({
    where: {
      tenantId: contract.tenantId,
      companyId: contract.companyId,
      isActive: true,
      occupancyTypeCode: { in: [...OCCUPANCY_CODES] },
    },
    orderBy: [{ displayOrder: "asc" }, { occupancyTypeCode: "asc" }],
  });

  const ratePlanIds = ratePlans.map((p) => p.propertyContractRatePlanId);

  const existingRates =
    ratePlanIds.length === 0
      ? []
      : await prisma.propertyContractRate.findMany({
          where: {
            propertyContractId: BigInt(input.propertyContractId),
            propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId),
            propertyContractRatePlanId: { in: ratePlanIds },
          },
        });

  const rateDayMap = await loadRateDayIdsByRate(
    existingRates.map((r) => r.propertyContractRateId)
  );

  const dayOfWeekIds = [
    ...new Set(existingRates.flatMap((r) => rateDayMap.get(Number(r.propertyContractRateId)) ?? [])),
  ].sort((a, b) => a - b);

  const cells = existingRates.map((r) => ({
    propertyContractRateId: Number(r.propertyContractRateId),
    propertyContractRatePlanId: Number(r.propertyContractRatePlanId),
    propertyRoomId: Number(r.propertyRoomId),
    occupancyTypeId: Number(r.occupancyTypeId),
    rateAmount: Number(r.rateAmount.toString()),
  }));

  return {
    propertyContractId: input.propertyContractId,
    propertyContractSeasonPeriodId: input.propertyContractSeasonPeriodId,
    ratePlanTypeId: input.ratePlanTypeId,
    seasonName: seasonPeriod.propertySeason?.seasonName,
    seasonCode: seasonPeriod.propertySeason?.seasonCode,
    fromDate: toDateOnly(seasonPeriod.fromDate),
    toDate: toDateOnly(seasonPeriod.toDate),
    currencyCode: contract.currency?.currencyCode,
    dayOfWeekIds,
    columns: ratePlans.map((p) => ({
      propertyContractRatePlanId: Number(p.propertyContractRatePlanId),
      ratePlanCode: p.ratePlanCode,
      ratePlanName: p.ratePlanName,
      mealPlanId: Number(p.mealPlan.mealPlanId),
      mealPlanCode: p.mealPlan.mealPlanCode,
      mealPlanName: formatMealPlanLabel(p.mealPlan.mealPlanCode, p.mealPlan.mealPlanName),
      displayOrder: p.displayOrder,
    })),
    rooms: rooms.map((r) => ({
      propertyRoomId: Number(r.propertyRoomId),
      roomCode: r.roomCode,
      roomName: r.roomName,
      displayOrder: r.displayOrder,
    })),
    occupancies: occupancies.map((o) => ({
      occupancyTypeId: Number(o.occupancyTypeId),
      occupancyTypeCode: o.occupancyTypeCode,
      occupancyTypeName: o.occupancyTypeName,
      displayOrder: o.displayOrder,
    })),
    cells,
  };
}

export async function savePropertyContractRateMatrix(input: {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  ratePlanTypeId: number;
  dayOfWeekIds: number[];
  createdBy: number;
  cells: {
    propertyContractRateId?: number;
    propertyContractRatePlanId: number;
    propertyRoomId: number;
    occupancyTypeId: number;
    rateAmount: number | null;
  }[];
}) {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(input.propertyContractId) },
  });
  if (!contract || contract.tenantId !== input.tenantId || contract.companyId !== input.companyId) {
    throw new Error("BAD_REQUEST:Contract not found for this tenant/company");
  }

  const seasonPeriod = await prisma.propertyContractSeasonPeriod.findUnique({
    where: { propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId) },
  });
  if (
    !seasonPeriod ||
    seasonPeriod.propertyContractId !== BigInt(input.propertyContractId)
  ) {
    throw new Error("BAD_REQUEST:Season period not found for this contract");
  }

  const validDayIds = new Set(
    (await listDayOfWeekRows(true)).map((d) => d.dayOfWeekId)
  );
  if (!input.dayOfWeekIds.every((id) => validDayIds.has(id))) {
    throw new Error("BAD_REQUEST:One or more days of week are invalid");
  }

  const toSave = input.cells.filter((c) => c.rateAmount != null && c.rateAmount >= 0);
  const toClearIds = input.cells
    .filter((c) => c.rateAmount == null && c.propertyContractRateId)
    .map((c) => c.propertyContractRateId!);

  let saved = 0;
  let removed = 0;

  await prisma.$transaction(async (tx) => {
    if (toClearIds.length > 0) {
      await tx.propertyContractRate.deleteMany({
        where: { propertyContractRateId: { in: toClearIds.map(BigInt) } },
      });
      removed += toClearIds.length;
    }

    for (const cell of toSave) {
      const ratePlan = await tx.propertyContractRatePlan.findUnique({
        where: { propertyContractRatePlanId: BigInt(cell.propertyContractRatePlanId) },
      });
      if (
        !ratePlan ||
        ratePlan.propertyContractId !== BigInt(input.propertyContractId) ||
        ratePlan.ratePlanTypeId !== BigInt(input.ratePlanTypeId)
      ) {
        throw new Error("BAD_REQUEST:Invalid rate plan for this matrix");
      }

      const room = await tx.propertyRoom.findUnique({
        where: { propertyRoomId: BigInt(cell.propertyRoomId) },
      });
      if (!room || room.propertyId !== contract.propertyId) {
        throw new Error("BAD_REQUEST:Invalid room type for this property");
      }

      const rateScalars = {
        tenantId: input.tenantId,
        companyId: input.companyId,
        propertyContractId: BigInt(input.propertyContractId),
        propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId),
        propertyContractRatePlanId: BigInt(cell.propertyContractRatePlanId),
        propertyRoomId: BigInt(cell.propertyRoomId),
        occupancyTypeId: BigInt(cell.occupancyTypeId),
        rateAmount: cell.rateAmount!,
        isActive: true,
      };

      let rateId: bigint;
      if (cell.propertyContractRateId) {
        await tx.propertyContractRate.update({
          where: { propertyContractRateId: BigInt(cell.propertyContractRateId) },
          data: {
            ...rateScalars,
            modifiedBy: input.createdBy,
            modifiedDtTm: new Date(),
          },
        });
        rateId = BigInt(cell.propertyContractRateId);
      } else {
        const created = await tx.propertyContractRate.create({
          data: { ...rateScalars, createdBy: input.createdBy },
        });
        rateId = created.propertyContractRateId;
      }

      await replacePropertyContractRateDays(tx, rateId, input.dayOfWeekIds, input.createdBy);
      saved += 1;
    }
  });

  const payload = await loadPropertyContractRateMatrix({
    propertyContractId: input.propertyContractId,
    propertyContractSeasonPeriodId: input.propertyContractSeasonPeriodId,
    ratePlanTypeId: input.ratePlanTypeId,
  });

  return { saved, removed, matrix: payload };
}
