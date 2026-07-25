import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  regionCode: z.string().trim().min(1, "Region code is required").max(100),
  regionName: z.string().trim().min(1, "Region name is required").max(200),
  status: z.enum(["active", "inactive"]).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  status: z.enum(["active", "inactive"]),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

type RouteContext = { params: Promise<{ regionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const region = await prisma.region.findUnique({ where: { regionId: regionId.data } });
    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    return NextResponse.json(region);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const region = await prisma.region.update({
      where: { regionId: regionId.data },
      data: {
        regionCode: parsed.data.regionCode.trim().toUpperCase(),
        regionName: parsed.data.regionName.trim(),
        status: parsed.data.status,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(region);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Region not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This region code is already in use" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const region = await prisma.region.update({
      where: { regionId: regionId.data },
      data: {
        status: parsed.data.status,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(region);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    await prisma.region.delete({ where: { regionId: regionId.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
