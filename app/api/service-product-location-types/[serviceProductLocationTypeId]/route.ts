import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  locationTypeCode: z.string().trim().min(1).max(50),
  locationTypeName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPickupLocation: z.boolean().optional(),
  isDropoffLocation: z.boolean().optional(),
  isMeetingPoint: z.boolean().optional(),
  isDestination: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductLocationTypeId: string }> };

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

function toRow<T extends { serviceProductLocationTypeId: bigint }>(row: T) {
  return { ...row, serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId) };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductLocationType.findUnique({
      where: { serviceProductLocationTypeId: BigInt(id.data) },
    });
    if (!row) return NextResponse.json({ error: "Location type not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.serviceProductLocationType.update({
      where: { serviceProductLocationTypeId: BigInt(id.data) },
      data: {
        locationTypeCode: data.locationTypeCode.trim().toUpperCase(),
        locationTypeName: data.locationTypeName.trim(),
        description: data.description?.trim() || null,
        isPickupLocation: data.isPickupLocation ?? false,
        isDropoffLocation: data.isDropoffLocation ?? false,
        isMeetingPoint: data.isMeetingPoint ?? false,
        isDestination: data.isDestination ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Location type not found" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "This location type code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductLocationType.update({
      where: { serviceProductLocationTypeId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Location type not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationTypeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductLocationType.delete({ where: { serviceProductLocationTypeId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Location type not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This location type is used by product locations and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
