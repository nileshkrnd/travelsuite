import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { listDayOfWeekRows, loadRateDayIdsByRate, replacePropertyContractRateDays } from "@/lib/api/day-of-week-helpers";
import {
  createPropertyContractStopSaleWithChildren,
  updatePropertyContractStopSaleWithChildren,
} from "@/lib/api/property-contract-stop-sale-helpers";
import {
  createPropertyContractBlackoutWithChildren,
  updatePropertyContractBlackoutWithChildren,
} from "@/lib/api/property-contract-blackout-helpers";
import {
  stopSaleTypeForbidsRatePlan,
  stopSaleTypeForbidsRoom,
  stopSaleTypeNeedsRatePlan,
  stopSaleTypeNeedsRoom,
} from "@/lib/constants/stop-sale-types";
import {
  blackoutTypeForbidsRatePlan,
  blackoutTypeForbidsRoom,
  blackoutTypeNeedsRatePlan,
  blackoutTypeNeedsRoom,
} from "@/lib/constants/blackout-types";

export type ContractExcelImportError = { sheet: string; row: number; message: string };

export type ContractExcelImportResult = {
  rates: { saved: number; deleted: number };
  inventory: { saved: number; deleted: number };
  stopSales: { saved: number; deleted: number };
  blackouts: { saved: number; deleted: number };
  errors: ContractExcelImportError[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
    const d = new Date(utc);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime()) && text.length >= 8) {
    return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
  }
  return text;
}

function cellText(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "object") {
    const obj = value as { text?: string; richText?: { text: string }[]; result?: unknown; hyperlink?: string };
    if (typeof obj.text === "string") return obj.text.trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((p) => p.text).join("").trim();
    if (obj.result !== undefined) return cellText(obj.result);
  }
  return String(value).trim();
}

function parseBool(value: unknown, fallback = true): boolean {
  const text = cellText(value).toUpperCase();
  if (!text) return fallback;
  return ["Y", "YES", "TRUE", "1"].includes(text);
}

function parseAction(value: unknown): "upsert" | "delete" {
  return cellText(value).toUpperCase() === "DELETE" ? "delete" : "upsert";
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
}

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: unknown[][]) {
  const sheet = wb.addWorksheet(name);
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  for (const row of rows) sheet.addRow(row);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = Math.min(28, Math.max(14, headers[i]!.length + 4));
  });
  return sheet;
}

function sheetByName(wb: ExcelJS.Workbook, name: string) {
  return wb.worksheets.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function readTable(sheet: ExcelJS.Worksheet): { headers: string[]; rows: Record<string, unknown>[] } {
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = cellText(cell.value);
  });
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = { __row: rowNumber };
    let empty = true;
    headers.forEach((header, col) => {
      if (!header) return;
      const value = row.getCell(col).value;
      record[header] = value;
      if (cellText(value) !== "") empty = false;
    });
    if (!empty) rows.push(record);
  });
  return { headers: headers.filter(Boolean), rows };
}

function get(row: Record<string, unknown>, key: string): unknown {
  if (key in row) return row[key];
  const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
  return found ? row[found] : "";
}

export async function buildPropertyContractWorkbook(propertyContractId: number): Promise<Buffer> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(propertyContractId) },
    include: { currency: { select: { currencyCode: true } } },
  });
  if (!contract) throw new Error("NOT_FOUND:Contract not found");

  const contractId = BigInt(propertyContractId);
  const [seasons, ratePlans, rooms, occupancies, inventoryTypes, rates, inventory, stopSales, blackouts, days] =
    await Promise.all([
      prisma.propertyContractSeasonPeriod.findMany({
        where: { propertyContractId: contractId },
        include: { propertySeason: { select: { seasonCode: true, seasonName: true } } },
        orderBy: { fromDate: "asc" },
      }),
      prisma.propertyContractRatePlan.findMany({
        where: { propertyContractId: contractId },
        include: {
          ratePlanType: { select: { ratePlanTypeCode: true } },
          mealPlan: { select: { mealPlanCode: true } },
        },
        orderBy: { ratePlanCode: "asc" },
      }),
      prisma.propertyRoom.findMany({
        where: { tenantId: contract.tenantId, propertyId: contract.propertyId, isActive: true },
        orderBy: { roomCode: "asc" },
      }),
      prisma.occupancyType.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        orderBy: { occupancyTypeCode: "asc" },
      }),
      prisma.inventoryType.findMany({ where: { isActive: true }, orderBy: { inventoryTypeCode: "asc" } }),
      prisma.propertyContractRate.findMany({
        where: { propertyContractId: contractId },
        include: {
          seasonPeriod: {
            include: { propertySeason: { select: { seasonCode: true } } },
          },
          ratePlan: { select: { ratePlanCode: true } },
          propertyRoom: { select: { roomCode: true } },
          occupancyType: { select: { occupancyTypeCode: true } },
        },
      }),
      prisma.propertyContractInventory.findMany({
        where: { propertyContractId: contractId },
        include: {
          seasonPeriod: { include: { propertySeason: { select: { seasonCode: true } } } },
          propertyRoom: { select: { roomCode: true } },
          inventoryType: { select: { inventoryTypeCode: true } },
        },
      }),
      prisma.propertyContractStopSale.findMany({
        where: { propertyContractId: contractId },
        include: {
          stopSaleType: { select: { stopSaleTypeCode: true } },
          propertyRoom: { select: { roomCode: true } },
          ratePlan: { select: { ratePlanCode: true } },
          stopSaleReason: { select: { stopSaleReasonCode: true } },
          stopSaleDays: { where: { isActive: true }, select: { dayOfWeekId: true } },
        },
      }),
      prisma.propertyContractBlackout.findMany({
        where: { propertyContractId: contractId },
        include: {
          blackoutType: { select: { blackoutTypeCode: true } },
          propertyRoom: { select: { roomCode: true } },
          ratePlan: { select: { ratePlanCode: true } },
          blackoutReason: { select: { blackoutReasonCode: true } },
          blackoutDays: { where: { isActive: true }, select: { dayOfWeekId: true } },
        },
      }),
      listDayOfWeekRows(true),
    ]);

  const dayCodeById = new Map(days.map((d) => [d.dayOfWeekId, d.dayOfWeekCode]));
  const rateDayMap = await loadRateDayIdsByRate(rates.map((r) => r.propertyContractRateId));

  function daysLabel(ids: number[]) {
    if (!ids.length) return "";
    return ids.map((id) => dayCodeById.get(id) ?? String(id)).join(",");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "TravelSuite";
  wb.created = new Date();

  const instructions = wb.addWorksheet("Instructions");
  instructions.getColumn(1).width = 110;
  const lines = [
    `Contract Excel template — ${contract.contractNumber} — ${contract.contractName}`,
    `Currency: ${contract.currency?.currencyCode ?? "—"}`,
    "",
    "How to use",
    "1. Keep sheet names as they are (Rates, Inventory, StopSales, Blackouts).",
    "2. Use codes from the Reference sheet (room, rate plan, season, occupancy, types).",
    "3. Dates must be YYYY-MM-DD.",
    "4. Days: comma-separated codes such as MON,TUE,WED. Leave blank to apply every day.",
    "5. IsActive / IsStopSell / IsClosed: YES or NO.",
    "6. Action: leave blank to create or update. Use DELETE to remove a matching row.",
    "7. Rates match on SeasonCode + FromDate + RatePlanCode + RoomCode + OccupancyCode.",
    "8. Inventory matches on SeasonCode + FromDate + RoomCode.",
    "9. Stop sales / blackouts: keep Id to update an existing row; leave Id blank to create.",
    "10. Save as .xlsx and upload on the contract page.",
  ];
  lines.forEach((line, i) => {
    instructions.getCell(i + 1, 1).value = line;
    if (i === 0) instructions.getCell(i + 1, 1).font = { bold: true, size: 14 };
  });

  addSheet(
    wb,
    "Rates",
    [
      "Action",
      "SeasonCode",
      "FromDate",
      "ToDate",
      "RatePlanCode",
      "RoomCode",
      "OccupancyCode",
      "RateAmount",
      "Days",
      "IsActive",
    ],
    rates.map((r) => [
      "",
      r.seasonPeriod.propertySeason?.seasonCode ?? "",
      r.seasonPeriod.fromDate.toISOString().slice(0, 10),
      r.seasonPeriod.toDate.toISOString().slice(0, 10),
      r.ratePlan.ratePlanCode,
      r.propertyRoom.roomCode,
      r.occupancyType.occupancyTypeCode,
      Number(r.rateAmount.toString()),
      daysLabel(rateDayMap.get(Number(r.propertyContractRateId)) ?? []),
      r.isActive ? "YES" : "NO",
    ])
  );

  addSheet(
    wb,
    "Inventory",
    [
      "Action",
      "SeasonCode",
      "FromDate",
      "ToDate",
      "RoomCode",
      "InventoryTypeCode",
      "AllotmentQty",
      "ReleaseDays",
      "IsStopSell",
      "IsClosed",
      "IsActive",
    ],
    inventory.map((r) => [
      "",
      r.seasonPeriod.propertySeason?.seasonCode ?? "",
      r.seasonPeriod.fromDate.toISOString().slice(0, 10),
      r.seasonPeriod.toDate.toISOString().slice(0, 10),
      r.propertyRoom.roomCode,
      r.inventoryType.inventoryTypeCode,
      r.allotmentQty,
      r.releaseDays,
      r.isStopSell ? "YES" : "NO",
      r.isClosed ? "YES" : "NO",
      r.isActive ? "YES" : "NO",
    ])
  );

  addSheet(
    wb,
    "StopSales",
    [
      "Action",
      "Id",
      "TypeCode",
      "RoomCode",
      "RatePlanCode",
      "FromDate",
      "ToDate",
      "ReasonCode",
      "Days",
      "Remarks",
      "IsActive",
    ],
    stopSales.map((r) => [
      "",
      Number(r.propertyContractStopSaleId),
      r.stopSaleType.stopSaleTypeCode,
      r.propertyRoom?.roomCode ?? "",
      r.ratePlan?.ratePlanCode ?? "",
      r.fromDate.toISOString().slice(0, 10),
      r.toDate.toISOString().slice(0, 10),
      r.stopSaleReason?.stopSaleReasonCode ?? "",
      daysLabel(r.stopSaleDays.map((d) => Number(d.dayOfWeekId))),
      r.remarks ?? "",
      r.isActive ? "YES" : "NO",
    ])
  );

  addSheet(
    wb,
    "Blackouts",
    [
      "Action",
      "Id",
      "TypeCode",
      "RoomCode",
      "RatePlanCode",
      "FromDate",
      "ToDate",
      "ReasonCode",
      "Days",
      "Remarks",
      "IsActive",
    ],
    blackouts.map((r) => [
      "",
      Number(r.propertyContractBlackoutId),
      r.blackoutType.blackoutTypeCode,
      r.propertyRoom?.roomCode ?? "",
      r.ratePlan?.ratePlanCode ?? "",
      r.fromDate.toISOString().slice(0, 10),
      r.toDate.toISOString().slice(0, 10),
      r.blackoutReason?.blackoutReasonCode ?? "",
      daysLabel(r.blackoutDays.map((d) => Number(d.dayOfWeekId))),
      r.remarks ?? "",
      r.isActive ? "YES" : "NO",
    ])
  );

  const ref = wb.addWorksheet("Reference");
  ref.getCell(1, 1).value = "Rooms";
  ref.getCell(1, 1).font = { bold: true };
  ref.addRow(["RoomCode", "RoomName"]);
  rooms.forEach((r) => ref.addRow([r.roomCode, r.roomName]));

  let col = 4;
  ref.getCell(1, col).value = "RatePlans";
  ref.getCell(1, col).font = { bold: true };
  ref.getCell(2, col).value = "RatePlanCode";
  ref.getCell(2, col + 1).value = "Name";
  ref.getCell(2, col + 2).value = "Type";
  ratePlans.forEach((p, i) => {
    ref.getCell(3 + i, col).value = p.ratePlanCode;
    ref.getCell(3 + i, col + 1).value = p.ratePlanName;
    ref.getCell(3 + i, col + 2).value = p.ratePlanType?.ratePlanTypeCode ?? "";
  });

  col = 8;
  ref.getCell(1, col).value = "Seasons";
  ref.getCell(1, col).font = { bold: true };
  ref.getCell(2, col).value = "SeasonCode";
  ref.getCell(2, col + 1).value = "FromDate";
  ref.getCell(2, col + 2).value = "ToDate";
  seasons.forEach((s, i) => {
    ref.getCell(3 + i, col).value = s.propertySeason?.seasonCode ?? "";
    ref.getCell(3 + i, col + 1).value = s.fromDate.toISOString().slice(0, 10);
    ref.getCell(3 + i, col + 2).value = s.toDate.toISOString().slice(0, 10);
  });

  col = 12;
  ref.getCell(1, col).value = "Occupancy";
  ref.getCell(1, col).font = { bold: true };
  occupancies.forEach((o, i) => {
    ref.getCell(2 + i, col).value = o.occupancyTypeCode;
  });

  col = 14;
  ref.getCell(1, col).value = "InventoryTypes";
  ref.getCell(1, col).font = { bold: true };
  inventoryTypes.forEach((t, i) => {
    ref.getCell(2 + i, col).value = t.inventoryTypeCode;
  });

  col = 16;
  ref.getCell(1, col).value = "Days";
  ref.getCell(1, col).font = { bold: true };
  days.forEach((d, i) => {
    ref.getCell(2 + i, col).value = d.dayOfWeekCode;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function parseDayCodes(raw: unknown, days: { dayOfWeekId: number; dayOfWeekCode: string }[]): number[] {
  const text = cellText(raw).toUpperCase().replace(/;/g, ",");
  if (!text) return [];
  const byCode = new Map(days.map((d) => [d.dayOfWeekCode.toUpperCase(), d.dayOfWeekId]));
  const ids: number[] = [];
  for (const token of text.split(",").map((t) => t.trim()).filter(Boolean)) {
    const id = byCode.get(token);
    if (id == null) throw new Error(`Unknown day code "${token}"`);
    ids.push(id);
  }
  return ids;
}

async function importRates(
  rows: Record<string, unknown>[],
  ctx: ImportContext
): Promise<{ saved: number; deleted: number }> {
  let saved = 0;
  let deleted = 0;
  for (const row of rows) {
    const rowNum = Number(row.__row ?? 0);
    try {
      const seasonCode = cellText(get(row, "SeasonCode")).toUpperCase();
      const fromDate = toIsoDate(get(row, "FromDate"));
      const ratePlanCode = cellText(get(row, "RatePlanCode")).toUpperCase();
      const roomCode = cellText(get(row, "RoomCode")).toUpperCase();
      const occupancyCode = cellText(get(row, "OccupancyCode")).toUpperCase();
      if (!seasonCode && !ratePlanCode && !roomCode) continue;
      if (!seasonCode || !ratePlanCode || !roomCode || !occupancyCode) {
        throw new Error("SeasonCode, RatePlanCode, RoomCode, and OccupancyCode are required");
      }

      const season = ctx.matchSeason(seasonCode, fromDate);
      const ratePlan = ctx.ratePlans.get(ratePlanCode);
      const room = ctx.rooms.get(roomCode);
      const occupancy = ctx.occupancies.get(occupancyCode);
      if (!season) throw new Error(`Unknown season "${seasonCode}"${fromDate ? ` / ${fromDate}` : ""}`);
      if (!ratePlan) throw new Error(`Unknown rate plan "${ratePlanCode}"`);
      if (!room) throw new Error(`Unknown room "${roomCode}"`);
      if (!occupancy) throw new Error(`Unknown occupancy "${occupancyCode}"`);

      const existing = await prisma.propertyContractRate.findFirst({
        where: {
          tenantId: ctx.tenantId,
          propertyContractId: ctx.contractId,
          propertyContractSeasonPeriodId: season.id,
          propertyContractRatePlanId: ratePlan,
          propertyRoomId: room,
          occupancyTypeId: occupancy,
        },
      });

      if (parseAction(get(row, "Action")) === "delete") {
        if (existing) {
          await prisma.propertyContractRate.delete({
            where: { propertyContractRateId: existing.propertyContractRateId },
          });
          deleted += 1;
        }
        continue;
      }

      const amountText = cellText(get(row, "RateAmount"));
      if (amountText === "") throw new Error("RateAmount is required");
      const rateAmount = Number(amountText);
      if (!Number.isFinite(rateAmount) || rateAmount < 0) throw new Error("RateAmount must be a number ≥ 0");
      const dayIds = parseDayCodes(get(row, "Days"), ctx.days);
      const isActive = parseBool(get(row, "IsActive"), true);

      const scalars = {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        propertyContractId: ctx.contractId,
        propertyContractSeasonPeriodId: season.id,
        propertyContractRatePlanId: ratePlan,
        propertyRoomId: room,
        occupancyTypeId: occupancy,
        rateAmount,
        isActive,
      };

      let rateId = existing?.propertyContractRateId;
      if (existing) {
        await prisma.propertyContractRate.update({
          where: { propertyContractRateId: existing.propertyContractRateId },
          data: { ...scalars, modifiedBy: ctx.actorKey, modifiedDtTm: new Date() },
        });
      } else {
        const created = await prisma.propertyContractRate.create({
          data: { ...scalars, createdBy: ctx.actorKey },
        });
        rateId = created.propertyContractRateId;
      }
      await prisma.$transaction(async (tx) => {
        await replacePropertyContractRateDays(tx, rateId!, dayIds, ctx.actorKey);
      });
      saved += 1;
    } catch (err) {
      ctx.errors.push({
        sheet: "Rates",
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import rate",
      });
    }
  }
  return { saved, deleted };
}

async function importInventory(
  rows: Record<string, unknown>[],
  ctx: ImportContext
): Promise<{ saved: number; deleted: number }> {
  let saved = 0;
  let deleted = 0;
  for (const row of rows) {
    const rowNum = Number(row.__row ?? 0);
    try {
      const seasonCode = cellText(get(row, "SeasonCode")).toUpperCase();
      const fromDate = toIsoDate(get(row, "FromDate"));
      const roomCode = cellText(get(row, "RoomCode")).toUpperCase();
      if (!seasonCode && !roomCode) continue;
      if (!seasonCode || !roomCode) throw new Error("SeasonCode and RoomCode are required");

      const season = ctx.matchSeason(seasonCode, fromDate);
      const room = ctx.rooms.get(roomCode);
      const typeCode = cellText(get(row, "InventoryTypeCode")).toUpperCase();
      const inventoryTypeId = ctx.inventoryTypes.get(typeCode);
      if (!season) throw new Error(`Unknown season "${seasonCode}"`);
      if (!room) throw new Error(`Unknown room "${roomCode}"`);
      if (!inventoryTypeId) throw new Error(`Unknown inventory type "${typeCode || "(blank)"}"`);

      const existing = await prisma.propertyContractInventory.findFirst({
        where: {
          tenantId: ctx.tenantId,
          propertyContractId: ctx.contractId,
          propertyContractSeasonPeriodId: season.id,
          propertyRoomId: room,
        },
      });

      if (parseAction(get(row, "Action")) === "delete") {
        if (existing) {
          await prisma.propertyContractInventory.delete({
            where: { propertyContractInventoryId: existing.propertyContractInventoryId },
          });
          deleted += 1;
        }
        continue;
      }

      const allotmentQty = Math.max(0, Math.floor(Number(cellText(get(row, "AllotmentQty")) || 0)));
      const releaseDays = Math.max(0, Math.floor(Number(cellText(get(row, "ReleaseDays")) || 0)));
      const scalars = {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        propertyContractId: ctx.contractId,
        propertyContractSeasonPeriodId: season.id,
        propertyRoomId: room,
        inventoryTypeId,
        allotmentQty,
        releaseDays,
        isStopSell: parseBool(get(row, "IsStopSell"), false),
        isClosed: parseBool(get(row, "IsClosed"), false),
        isActive: parseBool(get(row, "IsActive"), true),
      };

      if (existing) {
        await prisma.propertyContractInventory.update({
          where: { propertyContractInventoryId: existing.propertyContractInventoryId },
          data: { ...scalars, modifiedBy: ctx.actorKey, modifiedDtTm: new Date() },
        });
      } else {
        await prisma.propertyContractInventory.create({
          data: { ...scalars, createdBy: ctx.actorKey },
        });
      }
      saved += 1;
    } catch (err) {
      ctx.errors.push({
        sheet: "Inventory",
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import inventory",
      });
    }
  }
  return { saved, deleted };
}

type ImportContext = {
  tenantId: number;
  companyId: number;
  contractId: bigint;
  actorKey: number;
  rooms: Map<string, bigint>;
  ratePlans: Map<string, bigint>;
  occupancies: Map<string, bigint>;
  inventoryTypes: Map<string, bigint>;
  stopSaleTypes: Map<string, { id: bigint; code: string }>;
  stopSaleReasons: Map<string, bigint>;
  blackoutTypes: Map<string, { id: bigint; code: string }>;
  blackoutReasons: Map<string, bigint>;
  days: { dayOfWeekId: number; dayOfWeekCode: string }[];
  matchSeason: (code: string, fromDate: string) => { id: bigint } | null;
  errors: ContractExcelImportError[];
};

async function importClosures(
  sheetName: "StopSales" | "Blackouts",
  rows: Record<string, unknown>[],
  ctx: ImportContext
): Promise<{ saved: number; deleted: number }> {
  let saved = 0;
  let deleted = 0;
  const isStop = sheetName === "StopSales";

  for (const row of rows) {
    const rowNum = Number(row.__row ?? 0);
    try {
      const typeCode = cellText(get(row, "TypeCode")).toUpperCase();
      const fromDate = toIsoDate(get(row, "FromDate"));
      const toDate = toIsoDate(get(row, "ToDate"));
      if (!typeCode && !fromDate) continue;
      if (!typeCode || !fromDate || !toDate) throw new Error("TypeCode, FromDate, and ToDate are required");
      if (fromDate > toDate) throw new Error("FromDate must be on or before ToDate");

      const type = isStop ? ctx.stopSaleTypes.get(typeCode) : ctx.blackoutTypes.get(typeCode);
      if (!type) throw new Error(`Unknown type "${typeCode}"`);

      const roomCode = cellText(get(row, "RoomCode")).toUpperCase();
      const planCode = cellText(get(row, "RatePlanCode")).toUpperCase();
      let roomId = roomCode ? ctx.rooms.get(roomCode) ?? null : null;
      let planId = planCode ? ctx.ratePlans.get(planCode) ?? null : null;
      if (roomCode && roomId == null) throw new Error(`Unknown room "${roomCode}"`);
      if (planCode && planId == null) throw new Error(`Unknown rate plan "${planCode}"`);

      const needsRoom = isStop ? stopSaleTypeNeedsRoom(type.code) : blackoutTypeNeedsRoom(type.code);
      const forbidsRoom = isStop ? stopSaleTypeForbidsRoom(type.code) : blackoutTypeForbidsRoom(type.code);
      const needsPlan = isStop ? stopSaleTypeNeedsRatePlan(type.code) : blackoutTypeNeedsRatePlan(type.code);
      const forbidsPlan = isStop ? stopSaleTypeForbidsRatePlan(type.code) : blackoutTypeForbidsRatePlan(type.code);
      if (forbidsRoom) roomId = null;
      if (forbidsPlan) planId = null;
      if (needsRoom && roomId == null) throw new Error("RoomCode is required for this type");
      if (needsPlan && planId == null) throw new Error("RatePlanCode is required for this type");

      const reasonCode = cellText(get(row, "ReasonCode")).toUpperCase();
      const reasonId = reasonCode
        ? isStop
          ? ctx.stopSaleReasons.get(reasonCode)
          : ctx.blackoutReasons.get(reasonCode)
        : null;
      if (reasonCode && reasonId == null) throw new Error(`Unknown reason "${reasonCode}"`);

      const idText = cellText(get(row, "Id"));
      const id = idText ? Number(idText) : 0;
      const dayOfWeekIds = parseDayCodes(get(row, "Days"), ctx.days);
      const payload = {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        propertyContractId: Number(ctx.contractId),
        propertyRoomId: roomId != null ? Number(roomId) : null,
        propertyContractRatePlanId: planId != null ? Number(planId) : null,
        fromDate,
        toDate,
        remarks: cellText(get(row, "Remarks")) || null,
        isActive: parseBool(get(row, "IsActive"), true),
        dayOfWeekIds,
      };

      if (parseAction(get(row, "Action")) === "delete") {
        if (id <= 0) throw new Error("Id is required to delete this row");
        if (isStop) {
          const existing = await prisma.propertyContractStopSale.findUnique({
            where: { propertyContractStopSaleId: BigInt(id) },
            select: { propertyContractId: true },
          });
          if (!existing || existing.propertyContractId !== ctx.contractId) {
            throw new Error("Stop sale Id not found on this contract");
          }
          await prisma.propertyContractStopSale.delete({
            where: { propertyContractStopSaleId: BigInt(id) },
          });
        } else {
          const existing = await prisma.propertyContractBlackout.findUnique({
            where: { propertyContractBlackoutId: BigInt(id) },
            select: { propertyContractId: true },
          });
          if (!existing || existing.propertyContractId !== ctx.contractId) {
            throw new Error("Blackout Id not found on this contract");
          }
          await prisma.propertyContractBlackout.delete({
            where: { propertyContractBlackoutId: BigInt(id) },
          });
        }
        deleted += 1;
        continue;
      }

      if (isStop) {
        const data = {
          ...payload,
          stopSaleTypeId: Number(type.id),
          stopSaleReasonId: reasonId != null ? Number(reasonId) : null,
        };
        if (id > 0) {
          const existing = await prisma.propertyContractStopSale.findUnique({
            where: { propertyContractStopSaleId: BigInt(id) },
            select: { propertyContractId: true },
          });
          if (!existing || existing.propertyContractId !== ctx.contractId) {
            throw new Error("Stop sale Id not found on this contract");
          }
          await updatePropertyContractStopSaleWithChildren(BigInt(id), { ...data, modifiedBy: ctx.actorKey });
        } else {
          await createPropertyContractStopSaleWithChildren({ ...data, createdBy: ctx.actorKey });
        }
      } else {
        const data = {
          ...payload,
          blackoutTypeId: Number(type.id),
          blackoutReasonId: reasonId != null ? Number(reasonId) : null,
        };
        if (id > 0) {
          const existing = await prisma.propertyContractBlackout.findUnique({
            where: { propertyContractBlackoutId: BigInt(id) },
            select: { propertyContractId: true },
          });
          if (!existing || existing.propertyContractId !== ctx.contractId) {
            throw new Error("Blackout Id not found on this contract");
          }
          await updatePropertyContractBlackoutWithChildren(BigInt(id), { ...data, modifiedBy: ctx.actorKey });
        } else {
          await createPropertyContractBlackoutWithChildren({ ...data, createdBy: ctx.actorKey });
        }
      }
      saved += 1;
    } catch (err) {
      ctx.errors.push({
        sheet: sheetName,
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import row",
      });
    }
  }
  return { saved, deleted };
}

export async function importPropertyContractWorkbook(options: {
  propertyContractId: number;
  actorKey: number;
  buffer: Buffer;
}): Promise<ContractExcelImportResult> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(options.propertyContractId) },
  });
  if (!contract) throw new Error("NOT_FOUND:Contract not found");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(options.buffer as unknown as ExcelJS.Buffer);

  const [seasons, ratePlans, rooms, occupancies, inventoryTypes, stopSaleTypes, stopSaleReasons, blackoutTypes, blackoutReasons, days] =
    await Promise.all([
      prisma.propertyContractSeasonPeriod.findMany({
        where: { propertyContractId: contract.propertyContractId },
        include: { propertySeason: { select: { seasonCode: true } } },
      }),
      prisma.propertyContractRatePlan.findMany({
        where: { propertyContractId: contract.propertyContractId },
        select: { propertyContractRatePlanId: true, ratePlanCode: true },
      }),
      prisma.propertyRoom.findMany({
        where: { tenantId: contract.tenantId, propertyId: contract.propertyId },
        select: { propertyRoomId: true, roomCode: true },
      }),
      prisma.occupancyType.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        select: { occupancyTypeId: true, occupancyTypeCode: true },
      }),
      prisma.inventoryType.findMany({
        where: { isActive: true },
        select: { inventoryTypeId: true, inventoryTypeCode: true },
      }),
      prisma.stopSaleType.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        select: { stopSaleTypeId: true, stopSaleTypeCode: true },
      }),
      prisma.stopSaleReason.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        select: { stopSaleReasonId: true, stopSaleReasonCode: true },
      }),
      prisma.blackoutType.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        select: { blackoutTypeId: true, blackoutTypeCode: true },
      }),
      prisma.blackoutReason.findMany({
        where: { tenantId: contract.tenantId, companyId: contract.companyId, isActive: true },
        select: { blackoutReasonId: true, blackoutReasonCode: true },
      }),
      listDayOfWeekRows(true),
    ]);

  const errors: ContractExcelImportError[] = [];
  const ctx: ImportContext = {
    tenantId: contract.tenantId,
    companyId: contract.companyId,
    contractId: contract.propertyContractId,
    actorKey: options.actorKey,
    rooms: new Map(rooms.map((r) => [r.roomCode.toUpperCase(), r.propertyRoomId])),
    ratePlans: new Map(ratePlans.map((p) => [p.ratePlanCode.toUpperCase(), p.propertyContractRatePlanId])),
    occupancies: new Map(occupancies.map((o) => [o.occupancyTypeCode.toUpperCase(), o.occupancyTypeId])),
    inventoryTypes: new Map(inventoryTypes.map((t) => [t.inventoryTypeCode.toUpperCase(), t.inventoryTypeId])),
    stopSaleTypes: new Map(
      stopSaleTypes.map((t) => [t.stopSaleTypeCode.toUpperCase(), { id: t.stopSaleTypeId, code: t.stopSaleTypeCode }])
    ),
    stopSaleReasons: new Map(stopSaleReasons.map((r) => [r.stopSaleReasonCode.toUpperCase(), r.stopSaleReasonId])),
    blackoutTypes: new Map(
      blackoutTypes.map((t) => [t.blackoutTypeCode.toUpperCase(), { id: t.blackoutTypeId, code: t.blackoutTypeCode }])
    ),
    blackoutReasons: new Map(blackoutReasons.map((r) => [r.blackoutReasonCode.toUpperCase(), r.blackoutReasonId])),
    days,
    matchSeason(code, fromDate) {
      const matches = seasons.filter((s) => (s.propertySeason?.seasonCode ?? "").toUpperCase() === code);
      if (matches.length === 0) return null;
      if (fromDate) {
        const hit = matches.find((s) => s.fromDate.toISOString().slice(0, 10) === fromDate);
        if (hit) return { id: hit.propertyContractSeasonPeriodId };
      }
      return { id: matches[0]!.propertyContractSeasonPeriodId };
    },
    errors,
  };

  const empty = { saved: 0, deleted: 0 };
  const ratesSheet = sheetByName(wb, "Rates");
  const inventorySheet = sheetByName(wb, "Inventory");
  const stopSheet = sheetByName(wb, "StopSales");
  const blackoutSheet = sheetByName(wb, "Blackouts");

  if (!ratesSheet && !inventorySheet && !stopSheet && !blackoutSheet) {
    throw new Error("BAD_REQUEST:Workbook is missing Rates, Inventory, StopSales, and Blackouts sheets");
  }

  const rates = ratesSheet ? await importRates(readTable(ratesSheet).rows, ctx) : empty;
  const inventory = inventorySheet ? await importInventory(readTable(inventorySheet).rows, ctx) : empty;
  const stopSales = stopSheet ? await importClosures("StopSales", readTable(stopSheet).rows, ctx) : empty;
  const blackouts = blackoutSheet ? await importClosures("Blackouts", readTable(blackoutSheet).rows, ctx) : empty;

  return { rates, inventory, stopSales, blackouts, errors };
}
