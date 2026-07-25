import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  airlineTypeId: z.number().int().positive(),
  airlineCode: z.string().trim().min(2).max(3),
  airlineName: z.string().trim().min(1).max(200),
  airlineNumericCode: z.number().int().nullable().optional(),
  pnrMaxDigit: z.number().int().min(1).max(50),
  tktMaxDigit: z.number().int().min(1).max(50),
  isTktNumberOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});
const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ airlineId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { airlineId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airline id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const type = await prisma.airlineType.findUnique({ where: { airlineTypeId: data.airlineTypeId } });
    if (!type) return NextResponse.json({ error: "Airline type not found" }, { status: 400 });

    const updated = await prisma.airline.update({
      where: { airlineId: id.data },
      data: {
        airlineTypeId: data.airlineTypeId,
        airlineCode: data.airlineCode.trim().toUpperCase(),
        airlineName: data.airlineName.trim(),
        airlineNumericCode: data.airlineNumericCode ?? null,
        pnrMaxDigit: data.pnrMaxDigit,
        tktMaxDigit: data.tktMaxDigit,
        isTktNumberOnly: data.isTktNumberOnly ?? false,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: { airlineType: { select: { airlineTypeName: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Airline not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This airline code already exists" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { airlineId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airline id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.airline.update({
      where: { airlineId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: { airlineType: { select: { airlineTypeName: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { airlineId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airline id" }, { status: 400 });
    await prisma.airline.delete({ where: { airlineId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
