import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { FALLBACK_DAYS_OF_WEEK } from "@/lib/constants/day-of-week-fallback";
import type { DayOfWeek } from "@/types";

type DayOfWeekRow = {
  dayOfWeekId: bigint;
  dayOfWeekCode: string;
  dayOfWeekName: string;
  shortName: string;
  displayOrder: number;
  isActive: boolean;
};

function mapRow(row: DayOfWeekRow): DayOfWeek {
  return {
    dayOfWeekId: Number(row.dayOfWeekId),
    dayOfWeekCode: row.dayOfWeekCode,
    dayOfWeekName: row.dayOfWeekName,
    shortName: row.shortName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

/** List days — uses Prisma delegate when available, otherwise raw SQL, then static fallback. */
export async function listDayOfWeekRows(activeOnly = false): Promise<DayOfWeek[]> {
  try {
    const delegate = (prisma as unknown as { dayOfWeek?: { findMany: (args: unknown) => Promise<DayOfWeekRow[]> } })
      .dayOfWeek;
    if (delegate?.findMany) {
      const rows = await delegate.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [{ displayOrder: "asc" }, { dayOfWeekCode: "asc" }],
      });
      if (rows.length > 0) return rows.map(mapRow);
    }
  } catch {
    /* fall through */
  }

  try {
    const rows = activeOnly
      ? await prisma.$queryRaw<DayOfWeekRow[]>`
          SELECT "DayOfWeekID" AS "dayOfWeekId",
                 "DayOfWeekCode" AS "dayOfWeekCode",
                 "DayOfWeekName" AS "dayOfWeekName",
                 "ShortName" AS "shortName",
                 "DisplayOrder" AS "displayOrder",
                 "IsActive" AS "isActive"
          FROM "DayOfWeek"
          WHERE "IsActive" = true
          ORDER BY "DisplayOrder", "DayOfWeekCode"
        `
      : await prisma.$queryRaw<DayOfWeekRow[]>`
          SELECT "DayOfWeekID" AS "dayOfWeekId",
                 "DayOfWeekCode" AS "dayOfWeekCode",
                 "DayOfWeekName" AS "dayOfWeekName",
                 "ShortName" AS "shortName",
                 "DisplayOrder" AS "displayOrder",
                 "IsActive" AS "isActive"
          FROM "DayOfWeek"
          ORDER BY "DisplayOrder", "DayOfWeekCode"
        `;
    if (rows.length > 0) return rows.map(mapRow);
  } catch {
    /* table may not exist yet on very old DBs */
  }

  return activeOnly ? FALLBACK_DAYS_OF_WEEK.filter((d) => d.isActive) : FALLBACK_DAYS_OF_WEEK;
}

export async function replacePropertyContractRateDays(
  tx: Prisma.TransactionClient,
  propertyContractRateId: bigint,
  dayOfWeekIds: number[],
  createdBy: number
): Promise<void> {
  const rateDay = (tx as { propertyContractRateDay?: { deleteMany: Function; createMany: Function } })
    .propertyContractRateDay;

  if (rateDay?.deleteMany && rateDay?.createMany) {
    await rateDay.deleteMany({ where: { propertyContractRateId } });
    if (dayOfWeekIds.length > 0) {
      await rateDay.createMany({
        data: dayOfWeekIds.map((dayOfWeekId) => ({
          propertyContractRateId,
          dayOfWeekId: BigInt(dayOfWeekId),
          isActive: true,
          createdBy,
        })),
      });
    }
    return;
  }

  await tx.$executeRaw`
    DELETE FROM "PropertyContractRateDay" WHERE "PropertyContractRateID" = ${propertyContractRateId}
  `;
  for (const dayOfWeekId of dayOfWeekIds) {
    await tx.$executeRaw`
      INSERT INTO "PropertyContractRateDay"
        ("PropertyContractRateID", "DayOfWeekID", "IsActive", "CreatedBy")
      VALUES (${propertyContractRateId}, ${BigInt(dayOfWeekId)}, true, ${createdBy})
    `;
  }
}

export async function loadRateDayIdsByRate(propertyContractRateIds: bigint[]): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();
  if (propertyContractRateIds.length === 0) return result;

  try {
    const delegate = (prisma as {
      propertyContractRateDay?: { findMany: Function };
    }).propertyContractRateDay;

    if (delegate?.findMany) {
      const rows = (await delegate.findMany({
        where: { propertyContractRateId: { in: propertyContractRateIds }, isActive: true },
        select: { propertyContractRateId: true, dayOfWeekId: true },
      })) as { propertyContractRateId: bigint; dayOfWeekId: bigint }[];

      for (const row of rows) {
        const rateId = Number(row.propertyContractRateId);
        const list = result.get(rateId) ?? [];
        list.push(Number(row.dayOfWeekId));
        result.set(rateId, list);
      }
      return result;
    }
  } catch {
    /* fall through */
  }

  const rows = await prisma.$queryRaw<{ propertyContractRateId: bigint; dayOfWeekId: bigint }[]>`
    SELECT "PropertyContractRateID" AS "propertyContractRateId", "DayOfWeekID" AS "dayOfWeekId"
    FROM "PropertyContractRateDay"
    WHERE "PropertyContractRateID" IN (${Prisma.join(propertyContractRateIds)})
      AND "IsActive" = true
  `;

  for (const row of rows) {
    const rateId = Number(row.propertyContractRateId);
    const list = result.get(rateId) ?? [];
    list.push(Number(row.dayOfWeekId));
    result.set(rateId, list);
  }
  return result;
}
