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

const createSchema = z.object({
  cultureCode: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/, "Use a code like en, ar, or es"),
  cultureName: z.string().trim().min(1).max(200),
  direction: z.enum(["ltr", "rtl"]),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

/** Global Culture master — Super Admin. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rows = await prisma.culture.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { cultureCode: "asc" },
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

    const data = parsed.data;
    const code = data.cultureCode.toLowerCase();
    const created = await prisma.culture.create({
      data: {
        cultureCode: code,
        cultureName: data.cultureName,
        direction: data.direction,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This culture code is already in use" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
