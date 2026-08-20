import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  locationTypeCode: z.string().trim().min(1).max(50),
  locationTypeName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPickupLocation: z.boolean().optional(),
  isDropoffLocation: z.boolean().optional(),
  isMeetingPoint: z.boolean().optional(),
  isDestination: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

function toRow<T extends { serviceProductLocationTypeId: bigint }>(row: T) {
  return { ...row, serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.serviceProductLocationType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ displayOrder: "asc" }, { locationTypeCode: "asc" }],
    });
    return NextResponse.json(rows.map(toRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.serviceProductLocationType.create({
      data: {
        locationTypeCode: data.locationTypeCode.trim().toUpperCase(),
        locationTypeName: data.locationTypeName.trim(),
        description: data.description?.trim() || null,
        isPickupLocation: data.isPickupLocation ?? false,
        isDropoffLocation: data.isDropoffLocation ?? false,
        isMeetingPoint: data.isMeetingPoint ?? false,
        isDestination: data.isDestination ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This location type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
