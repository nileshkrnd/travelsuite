import { NextResponse } from "next/server";
import { z } from "zod";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  loadAvailabilityCalendar,
  saveAvailabilityCalendarUpdates,
} from "@/lib/api/property-room-availability-helpers";
import { monthDateRange } from "@/lib/mappers/property-room-availability.mapper";

const saveSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  updates: z
    .array(
      z.object({
        propertyRoomId: z.number().int().positive(),
        availabilityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        availableUnits: z.number().int().min(0).optional(),
        stopSell: z.boolean().optional(),
        closedToArrival: z.boolean().optional(),
        closedToDeparture: z.boolean().optional(),
        dailyRateAmount: z.number().min(0).nullable().optional(),
        dailyInventoryQty: z.number().int().min(0).nullable().optional(),
        minLengthOfStay: z.number().int().positive().nullable().optional(),
        maxLengthOfStay: z.number().int().positive().nullable().optional(),
        occupancyRateOverrides: z
          .array(
            z.object({
              propertyContractRatePlanId: z.number().int().positive(),
              occupancyTypeId: z.number().int().positive(),
              rateAmount: z.number().min(0).nullable(),
            })
          )
          .optional(),
      })
    )
    .min(1, "No updates provided"),
});

/** Load or save the property availability calendar for a month. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    const propertyId = Number(searchParams.get("propertyId"));
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (
      !Number.isFinite(tenantId) ||
      tenantId <= 0 ||
      !Number.isFinite(propertyId) ||
      propertyId <= 0 ||
      !Number.isFinite(year) ||
      year < 2000 ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "tenantId, propertyId, year, and month (1–12) are required" },
        { status: 400 }
      );
    }

    const payload = await loadAvailabilityCalendar({ tenantId, propertyId, year, month });
    const { days } = monthDateRange(year, month);
    return NextResponse.json({ ...payload, days });
  } catch (error) {
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

    const result = await saveAvailabilityCalendarUpdates(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
