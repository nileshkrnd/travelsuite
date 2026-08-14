import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  loadPropertyContractRateMatrix,
  savePropertyContractRateMatrix,
} from "@/lib/api/property-contract-rate-matrix-helpers";

const saveSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive(),
  propertyContractSeasonPeriodId: z.number().int().positive(),
  ratePlanTypeId: z.number().int().positive(),
  dayOfWeekIds: z.array(z.number().int().positive()).min(1, "Select at least one day"),
  createdBy: z.number().int().positive(),
  cells: z.array(
    z.object({
      propertyContractRateId: z.number().int().positive().optional(),
      propertyContractRatePlanId: z.number().int().positive(),
      propertyRoomId: z.number().int().positive(),
      occupancyTypeId: z.number().int().positive(),
      rateAmount: z.number().min(0).nullable(),
    })
  ),
});

/** Load or save the contract rate matrix (season + rate plan type + room grid). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyContractId = Number(searchParams.get("propertyContractId"));
    const propertyContractSeasonPeriodId = Number(searchParams.get("propertyContractSeasonPeriodId"));
    const ratePlanTypeId = Number(searchParams.get("ratePlanTypeId"));

    if (
      !Number.isFinite(propertyContractId) ||
      propertyContractId <= 0 ||
      !Number.isFinite(propertyContractSeasonPeriodId) ||
      propertyContractSeasonPeriodId <= 0 ||
      !Number.isFinite(ratePlanTypeId) ||
      ratePlanTypeId <= 0
    ) {
      return NextResponse.json(
        { error: "propertyContractId, propertyContractSeasonPeriodId, and ratePlanTypeId are required" },
        { status: 400 }
      );
    }

    const payload = await loadPropertyContractRateMatrix({
      propertyContractId,
      propertyContractSeasonPeriodId,
      ratePlanTypeId,
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

    const result = await savePropertyContractRateMatrix(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: error.message.replace("BAD_REQUEST:", "") }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A rate already exists for this season, plan, room type, and occupancy combination" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
