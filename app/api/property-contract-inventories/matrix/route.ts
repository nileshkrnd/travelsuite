import { NextResponse } from "next/server";
import { z } from "zod";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  loadPropertyContractInventoryMatrix,
  savePropertyContractInventoryMatrix,
} from "@/lib/api/property-contract-inventory-matrix-helpers";

const saveSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive(),
  propertyContractSeasonPeriodId: z.number().int().positive(),
  inventoryTypeId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  cells: z.array(
    z.object({
      propertyContractInventoryId: z.number().int().positive().optional(),
      propertyRoomId: z.number().int().positive(),
      allotmentQty: z.number().int().min(0).nullable(),
      releaseDays: z.number().int().min(0).nullable(),
      isStopSell: z.boolean(),
      isClosed: z.boolean(),
    })
  ),
});

/** Load or save contract inventory matrix (season + inventory type + room grid). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyContractId = Number(searchParams.get("propertyContractId"));
    const propertyContractSeasonPeriodId = Number(searchParams.get("propertyContractSeasonPeriodId"));
    const inventoryTypeId = Number(searchParams.get("inventoryTypeId"));

    if (
      !Number.isFinite(propertyContractId) ||
      propertyContractId <= 0 ||
      !Number.isFinite(propertyContractSeasonPeriodId) ||
      propertyContractSeasonPeriodId <= 0 ||
      !Number.isFinite(inventoryTypeId) ||
      inventoryTypeId <= 0
    ) {
      return NextResponse.json(
        { error: "propertyContractId, propertyContractSeasonPeriodId, and inventoryTypeId are required" },
        { status: 400 }
      );
    }

    const payload = await loadPropertyContractInventoryMatrix({
      propertyContractId,
      propertyContractSeasonPeriodId,
      inventoryTypeId,
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: error.message.replace("NOT_FOUND:", "") }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const result = await savePropertyContractInventoryMatrix(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: error.message.replace("BAD_REQUEST:", "") }, { status: 400 });
    }
    return dbUnavailable(error);
  }
}
