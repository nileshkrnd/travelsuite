import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  airlineTypeName: z.string().trim().min(1).max(100),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const rows = await prisma.airlineType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { airlineTypeName: "asc" },
    });
    return NextResponse.json(rows);
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
    const created = await prisma.airlineType.create({
      data: {
        airlineTypeName: parsed.data.airlineTypeName.trim(),
        isActive: parsed.data.isActive ?? true,
        createdBy: parsed.data.createdBy,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This airline type name already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
