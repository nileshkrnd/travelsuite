import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
  modifiedBy: z.number().int().positive(),
});

/** Reorder subscription modules (Administration before HRMS, etc.). */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const { orderedIds, modifiedBy } = parsed.data;
    const uniqueIds = [...new Set(orderedIds)];
    if (uniqueIds.length !== orderedIds.length) {
      return NextResponse.json({ error: "orderedIds must be unique" }, { status: 400 });
    }

    const existing = await prisma.subscriptionModule.findMany({
      where: { subscriptionModuleId: { in: orderedIds } },
      select: { subscriptionModuleId: true },
    });
    if (existing.length !== orderedIds.length) {
      return NextResponse.json({ error: "One or more modules were not found" }, { status: 404 });
    }

    const now = new Date();
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.subscriptionModule.update({
          where: { subscriptionModuleId: id },
          data: {
            sortOrder: index,
            modifiedBy,
            modifiedDtTm: now,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, count: orderedIds.length });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "One or more modules were not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
