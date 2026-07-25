import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  countryCode: z.string().trim().min(1).max(10),
  countryName: z.string().trim().min(1).max(200),
  dialCode: z.string().trim().min(1).max(20),
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

type RouteContext = { params: Promise<{ countryId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { countryId } = await context.params;
    const id = idSchema.safeParse(countryId);
    if (!id.success) return NextResponse.json({ error: "Invalid country id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.country.update({
      where: { countryId: id.data },
      data: {
        countryCode: data.countryCode.toUpperCase(),
        countryName: data.countryName,
        dialCode: data.dialCode,
        status: data.status,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Country not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This country code is already in use" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { countryId } = await context.params;
    const id = idSchema.safeParse(countryId);
    if (!id.success) return NextResponse.json({ error: "Invalid country id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.country.update({
      where: { countryId: id.data },
      data: {
        status: parsed.data.status,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
