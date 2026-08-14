import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalFkId = z.number().int().positive().nullable().optional();

export const propertyRoomWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyId: z.number().int().positive("Property is required"),
    roomTypeId: z.number().int().positive("Room type is required"),
    roomCode: z.string().trim().min(1, "Room code is required").max(50),
    roomName: z.string().trim().min(1, "Room name is required").max(200),
    description: z.string().trim().max(20000).optional().nullable().or(z.literal("")),
    maxAdult: z.number().int().min(0, "Max adult cannot be negative"),
    maxChild: z.number().int().min(0, "Max child cannot be negative"),
    maxOccupancy: z.number().int().min(0, "Max occupancy cannot be negative"),
    roomSize: z.number().min(0, "Room size cannot be negative").nullable().optional(),
    roomSizeUnitId: optionalFkId,
    smokingTypeId: optionalFkId,
    viewTypeId: optionalFkId,
    extraBedAllowed: z.boolean().optional(),
    maxExtraBed: z.number().int().min(0, "Max extra bed cannot be negative").optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.maxOccupancy < values.maxAdult) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOccupancy"],
        message: "Max occupancy must be at least Max adult",
      });
    }
    const extraAllowed = values.extraBedAllowed ?? false;
    const maxExtra = values.maxExtraBed ?? 0;
    if (!extraAllowed && maxExtra > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["maxExtraBed"],
        message: "Max extra bed must be 0 when extra bed is not allowed",
      });
    }
    if (values.roomSize != null && values.roomSize > 0 && !values.roomSizeUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["roomSizeUnitId"],
        message: "Room size unit is required when room size is set",
      });
    }
  });

export type PropertyRoomWriteData = z.infer<typeof propertyRoomWriteSchema>;

export const propertyRoomInclude = {
  property: { select: { propertyName: true, propertyCode: true } },
  roomType: { select: { roomTypeCode: true, roomTypeName: true } },
  roomSizeUnit: { select: { roomSizeUnitCode: true, roomSizeUnitName: true } },
  smokingType: { select: { smokingTypeCode: true, smokingTypeName: true } },
  viewType: { select: { viewTypeCode: true, viewTypeName: true } },
} as const;

type SerializableRow = {
  propertyRoomId: bigint;
  roomTypeId: bigint;
  roomSize?: Prisma.Decimal | null;
  roomSizeUnitId?: bigint | null;
  smokingTypeId?: bigint | null;
  viewTypeId?: bigint | null;
  [key: string]: unknown;
};

export function serializePropertyRoomRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    propertyRoomId: Number(row.propertyRoomId),
    roomTypeId: Number(row.roomTypeId),
    roomSize: row.roomSize == null ? null : Number(row.roomSize.toString()),
    roomSizeUnitId: row.roomSizeUnitId == null ? null : Number(row.roomSizeUnitId),
    smokingTypeId: row.smokingTypeId == null ? null : Number(row.smokingTypeId),
    viewTypeId: row.viewTypeId == null ? null : Number(row.viewTypeId),
  };
}

export async function validatePropertyRoomLookups(
  data: PropertyRoomWriteData
): Promise<NextResponse | null> {
  const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

  const roomType = await prisma.roomType.findUnique({
    where: { roomTypeId: BigInt(data.roomTypeId) },
  });
  if (!roomType || roomType.isDeleted || !roomType.isActive) {
    return NextResponse.json({ error: "Room type not found" }, { status: 400 });
  }

  if (data.roomSizeUnitId) {
    const unit = await prisma.roomSizeUnit.findUnique({
      where: { roomSizeUnitId: BigInt(data.roomSizeUnitId) },
    });
    if (!unit || unit.isDeleted || !unit.isActive) {
      return NextResponse.json({ error: "Room size unit not found" }, { status: 400 });
    }
  }

  if (data.smokingTypeId) {
    const smoking = await prisma.smokingType.findUnique({
      where: { smokingTypeId: BigInt(data.smokingTypeId) },
    });
    if (!smoking || smoking.isDeleted || !smoking.isActive) {
      return NextResponse.json({ error: "Smoking type not found" }, { status: 400 });
    }
  }

  if (data.viewTypeId) {
    const view = await prisma.viewType.findUnique({
      where: { viewTypeId: BigInt(data.viewTypeId) },
    });
    if (!view || view.isDeleted || !view.isActive) {
      return NextResponse.json({ error: "View type not found" }, { status: 400 });
    }
  }

  return null;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function scalars(data: PropertyRoomWriteData) {
  const extraBedAllowed = data.extraBedAllowed ?? false;
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyId: data.propertyId,
    roomTypeId: BigInt(data.roomTypeId),
    roomCode: data.roomCode,
    roomName: data.roomName,
    description: emptyToNull(data.description),
    maxAdult: data.maxAdult,
    maxChild: data.maxChild,
    maxOccupancy: data.maxOccupancy,
    roomSize: data.roomSize ?? null,
    roomSizeUnitId: data.roomSizeUnitId ? BigInt(data.roomSizeUnitId) : null,
    smokingTypeId: data.smokingTypeId ? BigInt(data.smokingTypeId) : null,
    viewTypeId: data.viewTypeId ? BigInt(data.viewTypeId) : null,
    extraBedAllowed,
    maxExtraBed: extraBedAllowed ? (data.maxExtraBed ?? 0) : 0,
    displayOrder: data.displayOrder ?? 0,
  };
}

export function toPropertyRoomCreateData(
  data: PropertyRoomWriteData & { createdBy: number }
): Prisma.PropertyRoomUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyRoomUpdateScalars(
  data: PropertyRoomWriteData & { modifiedBy: number }
): Prisma.PropertyRoomUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
