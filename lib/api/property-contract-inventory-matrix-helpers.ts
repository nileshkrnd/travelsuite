import { prisma } from "@/lib/db";
import type { PropertyContractInventoryMatrixPayload } from "@/types/property-contract-inventory-matrix";

function toDateOnly(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export async function loadPropertyContractInventoryMatrix(input: {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  inventoryTypeId: number;
}): Promise<PropertyContractInventoryMatrixPayload> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(input.propertyContractId) },
  });
  if (!contract) throw new Error("NOT_FOUND:Contract not found");

  const seasonPeriod = await prisma.propertyContractSeasonPeriod.findUnique({
    where: { propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId) },
    include: { propertySeason: { select: { seasonCode: true, seasonName: true } } },
  });
  if (!seasonPeriod || seasonPeriod.propertyContractId !== BigInt(input.propertyContractId)) {
    throw new Error("NOT_FOUND:Season period not found for this contract");
  }

  const inventoryTypes = await prisma.inventoryType.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { inventoryTypeCode: "asc" }],
  });

  const rooms = await prisma.propertyRoom.findMany({
    where: { tenantId: contract.tenantId, propertyId: contract.propertyId, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { roomName: "asc" }],
    select: { propertyRoomId: true, roomCode: true, roomName: true, displayOrder: true },
  });

  const existing = await prisma.propertyContractInventory.findMany({
    where: {
      propertyContractId: BigInt(input.propertyContractId),
      propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId),
    },
  });

  const byRoom = new Map(existing.map((r) => [Number(r.propertyRoomId), r]));

  const cells = rooms.map((room) => {
    const row = byRoom.get(Number(room.propertyRoomId));
    return {
      propertyContractInventoryId: row ? Number(row.propertyContractInventoryId) : undefined,
      propertyRoomId: Number(room.propertyRoomId),
      allotmentQty: row?.allotmentQty ?? null,
      releaseDays: row?.releaseDays ?? null,
      isStopSell: row?.isStopSell ?? false,
      isClosed: row?.isClosed ?? false,
    };
  });

  return {
    propertyContractId: input.propertyContractId,
    propertyContractSeasonPeriodId: input.propertyContractSeasonPeriodId,
    inventoryTypeId: input.inventoryTypeId,
    seasonName: seasonPeriod.propertySeason?.seasonName,
    seasonCode: seasonPeriod.propertySeason?.seasonCode,
    fromDate: toDateOnly(seasonPeriod.fromDate),
    toDate: toDateOnly(seasonPeriod.toDate),
    inventoryTypes: inventoryTypes.map((t) => ({
      inventoryTypeId: Number(t.inventoryTypeId),
      inventoryTypeCode: t.inventoryTypeCode,
      inventoryTypeName: t.inventoryTypeName,
      displayOrder: t.displayOrder,
    })),
    rooms: rooms.map((r) => ({
      propertyRoomId: Number(r.propertyRoomId),
      roomCode: r.roomCode,
      roomName: r.roomName,
      displayOrder: r.displayOrder,
    })),
    cells,
  };
}

function cellHasData(cell: {
  allotmentQty: number | null;
  releaseDays: number | null;
  isStopSell: boolean;
  isClosed: boolean;
}) {
  return (
    (cell.allotmentQty != null && cell.allotmentQty > 0) ||
    (cell.releaseDays != null && cell.releaseDays > 0) ||
    cell.isStopSell ||
    cell.isClosed
  );
}

export async function savePropertyContractInventoryMatrix(input: {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  inventoryTypeId: number;
  createdBy: number;
  cells: {
    propertyContractInventoryId?: number;
    propertyRoomId: number;
    allotmentQty: number | null;
    releaseDays: number | null;
    isStopSell: boolean;
    isClosed: boolean;
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
  if (!seasonPeriod || seasonPeriod.propertyContractId !== BigInt(input.propertyContractId)) {
    throw new Error("BAD_REQUEST:Season period not found for this contract");
  }

  const inventoryType = await prisma.inventoryType.findUnique({
    where: { inventoryTypeId: BigInt(input.inventoryTypeId) },
  });
  if (!inventoryType?.isActive) {
    throw new Error("BAD_REQUEST:Invalid inventory type");
  }

  const toSave = input.cells.filter((c) => cellHasData(c));
  const toClearIds = input.cells
    .filter((c) => !cellHasData(c) && c.propertyContractInventoryId)
    .map((c) => c.propertyContractInventoryId!);

  if (inventoryType.inventoryTypeCode === "ALLOTMENT") {
    const invalid = toSave.some((c) => (c.allotmentQty ?? 0) <= 0);
    if (invalid) {
      throw new Error("BAD_REQUEST:Allotment quantity is required for each room when type is Allotment");
    }
  }

  let saved = 0;
  let removed = 0;

  await prisma.$transaction(async (tx) => {
    if (toClearIds.length > 0) {
      await tx.propertyContractInventory.deleteMany({
        where: { propertyContractInventoryId: { in: toClearIds.map(BigInt) } },
      });
      removed += toClearIds.length;
    }

    for (const cell of toSave) {
      const room = await tx.propertyRoom.findUnique({
        where: { propertyRoomId: BigInt(cell.propertyRoomId) },
      });
      if (!room || room.propertyId !== contract.propertyId) {
        throw new Error("BAD_REQUEST:Invalid room type for this property");
      }

      const scalars = {
        tenantId: input.tenantId,
        companyId: input.companyId,
        propertyContractId: BigInt(input.propertyContractId),
        propertyContractSeasonPeriodId: BigInt(input.propertyContractSeasonPeriodId),
        propertyRoomId: BigInt(cell.propertyRoomId),
        inventoryTypeId: BigInt(input.inventoryTypeId),
        allotmentQty: cell.allotmentQty ?? 0,
        releaseDays: cell.releaseDays ?? 0,
        isStopSell: cell.isStopSell,
        isClosed: cell.isClosed,
        isActive: true,
      };

      if (cell.propertyContractInventoryId) {
        await tx.propertyContractInventory.update({
          where: { propertyContractInventoryId: BigInt(cell.propertyContractInventoryId) },
          data: { ...scalars, modifiedBy: input.createdBy, modifiedDtTm: new Date() },
        });
      } else {
        await tx.propertyContractInventory.create({
          data: { ...scalars, createdBy: input.createdBy },
        });
      }
      saved += 1;
    }
  });

  return { saved, removed };
}
