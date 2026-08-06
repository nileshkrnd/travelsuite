import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

/** SupplierTypeID is a BigInt column — convert to number before NextResponse.json() (JSON.stringify throws on bigint). */
function serialize<T extends { supplierTypeId: bigint }>(row: T) {
  return { ...row, supplierTypeId: Number(row.supplierTypeId) };
}

const createSchema = z.object({
  supplierTypeName: z.string().trim().min(1).max(150),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Supplier Type master — DMC, Hotelier, Tour Operator, Transport, Activity Provider, … Global. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const rows = await prisma.supplierType.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: { supplierTypeName: "asc" },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const created = await prisma.supplierType.create({
      data: {
        supplierTypeName: data.supplierTypeName,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This supplier type already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
