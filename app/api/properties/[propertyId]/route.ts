import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyInclude,
  propertyWriteSchema,
  serializePropertyRow,
  toPropertyUpdateScalars,
  validatePropertyLookups,
  withCompanyName,
} from "@/lib/api/property-helpers";

const idSchema = z.coerce.number().int().positive();

const updateSchema = propertyWriteSchema.and(
  z.object({
    modifiedBy: z.number().int().positive(),
  })
);

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid property id" }, { status: 400 });

    const row = await prisma.property.findUnique({
      where: { propertyId: id.data },
      include: propertyInclude,
    });
    if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const [withName] = await withCompanyName([row]);
    return NextResponse.json(serializePropertyRow(withName));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid property id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const lookupError = await validatePropertyLookups(data);
    if (lookupError) return lookupError;

    const typeIds = [...new Set(data.propertyTypeIds)];
    const categoryIds = [...new Set(data.propertyCategoryIds ?? [])];

    const updated = await prisma.$transaction(async (tx) => {
      await tx.propertyTypeLink.deleteMany({ where: { propertyId: id.data } });
      await tx.propertyCategoryLink.deleteMany({ where: { propertyId: id.data } });
      return tx.property.update({
        where: { propertyId: id.data },
        data: {
          ...toPropertyUpdateScalars(data),
          typeLinks: { create: typeIds.map((propertyTypeId) => ({ propertyTypeId: BigInt(propertyTypeId) })) },
          categoryLinks: {
            create: categoryIds.map((propertyCategoryId) => ({ propertyCategoryId: BigInt(propertyCategoryId) })),
          },
        },
        include: propertyInclude,
      });
    });

    const [withName] = await withCompanyName([updated]);
    return NextResponse.json(serializePropertyRow(withName));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Property not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This property code already exists for this company" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid property id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.property.update({
      where: { propertyId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyInclude,
    });
    const [withName] = await withCompanyName([updated]);
    return NextResponse.json(serializePropertyRow(withName));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid property id" }, { status: 400 });

    await prisma.property.delete({ where: { propertyId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
