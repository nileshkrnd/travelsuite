import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const propertyFloorInclude = {
  property: { select: { propertyCode: true, propertyName: true, propertyDisplayName: true } },
  floorType: { select: { floorTypeName: true } },
  areaUnit: { select: { roomSizeUnitName: true } },
} as const;

export async function refreshFloorUnitCounts(propertyFloorId: bigint) {
  const units = await prisma.propertyUnit.findMany({
    where: { propertyFloorId, isActive: true },
    include: { unitStatus: { select: { statusCode: true } } },
  });
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.unitStatus.statusCode === "OCCUPIED").length;
  const availableUnits = units.filter((u) => u.unitStatus.statusCode === "AVAILABLE").length;
  await prisma.propertyFloor.update({
    where: { propertyFloorId },
    data: { totalUnits, occupiedUnits, availableUnits },
  });
}

export const propertyUnitInclude = {
  property: { select: { propertyCode: true, propertyName: true, propertyDisplayName: true } },
  floor: { select: { floorCode: true, floorName: true } },
  unitType: { select: { unitTypeName: true } },
  unitCategory: { select: { unitCategoryName: true } },
  unitStatus: { select: { statusName: true, statusCode: true } },
  areaUnit: { select: { roomSizeUnitName: true } },
  furnishedStatus: { select: { furnishedStatusName: true } },
  viewType: { select: { viewTypeName: true } },
} as const;

export async function findUnitStatusId(statusCode: string) {
  const row = await prisma.unitStatus.findUnique({ where: { statusCode } });
  return row?.unitStatusId ?? null;
}

type CurrentTenantRow = {
  unitId: bigint;
  allocatedFrom: Date;
  propertyTenantId: bigint;
  tenantCode: string;
  tenantName: string;
};

export async function loadCurrentTenants(unitIds: bigint[]) {
  if (unitIds.length === 0) return new Map<string, CurrentTenantRow>();
  const rows = await prisma.$queryRaw<CurrentTenantRow[]>`
    SELECT a."UnitID" AS "unitId",
           a."AllocatedFrom" AS "allocatedFrom",
           t."PropertyTenantID" AS "propertyTenantId",
           t."TenantCode" AS "tenantCode",
           t."TenantName" AS "tenantName"
    FROM "UnitTenantAllocation" a
    INNER JOIN "PropertyTenant" t ON t."PropertyTenantID" = a."PropertyTenantID"
    WHERE a."IsActive" = true
      AND a."UnitID" IN (${Prisma.join(unitIds)})
  `;
  return new Map(rows.map((row) => [row.unitId.toString(), row]));
}

type UnitSerializeRow = {
  unitId: bigint;
  propertyFloorId: bigint;
  unitTypeId: bigint;
  unitCategoryId: bigint | null;
  unitStatusId: bigint;
  areaUnitId: bigint;
  furnishedStatusId: bigint | null;
  viewTypeId: bigint | null;
  blockReason?: string | null;
};

function dateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const yyyy = value.getUTCFullYear();
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(value.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function jsonSafe(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof (value as { toJSON?: () => unknown }).toJSON === "function") {
    return (value as { toJSON: () => unknown }).toJSON();
  }
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const asString = (value as { toString: () => string }).toString();
    if (asString !== "[object Object]") {
      const asNumber = Number(asString);
      return Number.isFinite(asNumber) ? asNumber : asString;
    }
  }
  return value;
}

export function serializePropertyUnit<T extends UnitSerializeRow>(
  row: T,
  tenant?: CurrentTenantRow | null
) {
  const raw = row as T & { area?: unknown; createdDtTm?: unknown; modifiedDtTm?: unknown };
  return {
    ...row,
    unitId: Number(row.unitId),
    propertyFloorId: Number(row.propertyFloorId),
    unitTypeId: Number(row.unitTypeId),
    unitCategoryId: row.unitCategoryId != null ? Number(row.unitCategoryId) : null,
    unitStatusId: Number(row.unitStatusId),
    areaUnitId: Number(row.areaUnitId),
    furnishedStatusId: row.furnishedStatusId != null ? Number(row.furnishedStatusId) : null,
    viewTypeId: row.viewTypeId != null ? Number(row.viewTypeId) : null,
    area: jsonSafe(raw.area),
    createdDtTm: jsonSafe(raw.createdDtTm),
    modifiedDtTm: jsonSafe(raw.modifiedDtTm),
    blockReason: row.blockReason ?? null,
    currentTenantId: tenant ? Number(tenant.propertyTenantId) : null,
    currentTenantCode: tenant?.tenantCode ?? null,
    currentTenantName: tenant?.tenantName ?? null,
    allocatedFrom: dateOnly(tenant?.allocatedFrom),
  };
}

export async function serializePropertyUnits<T extends UnitSerializeRow>(rows: T[]) {
  const unitIds = rows.map((row) => row.unitId);
  const [tenants, reasons] = await Promise.all([
    loadCurrentTenants(unitIds),
    unitIds.length === 0
      ? Promise.resolve([] as Array<{ unitId: bigint; blockReason: string | null }>)
      : prisma.$queryRaw<Array<{ unitId: bigint; blockReason: string | null }>>`
          SELECT "UnitID" AS "unitId", "BlockReason" AS "blockReason"
          FROM "UnitMaster"
          WHERE "UnitID" IN (${Prisma.join(unitIds)})
        `,
  ]);
  const reasonById = new Map(reasons.map((row) => [row.unitId.toString(), row.blockReason]));
  return rows.map((row) =>
    serializePropertyUnit(
      { ...row, blockReason: reasonById.get(row.unitId.toString()) ?? row.blockReason ?? null },
      tenants.get(row.unitId.toString()) ?? null
    )
  );
}
