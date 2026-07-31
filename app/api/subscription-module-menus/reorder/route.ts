import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const reorderSchema = z.object({
  subscriptionModuleId: z.number().int().positive(),
  parentMenuId: z.number().int().positive().nullable(),
  orderedIds: z.array(z.number().int().positive()).min(1),
  modifiedBy: z.number().int().positive(),
});

/** Reorder sibling menus under the same parent (updates SortOrder). */
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

    const { subscriptionModuleId, parentMenuId, orderedIds, modifiedBy } = parsed.data;

    const siblings = await prisma.subscriptionModuleMenu.findMany({
      where: {
        subscriptionModuleId,
        parentMenuId,
      },
      select: { subscriptionModuleMenuId: true },
    });

    const siblingIds = new Set(siblings.map((s) => s.subscriptionModuleMenuId));
    if (
      orderedIds.length !== siblingIds.size ||
      orderedIds.some((id) => !siblingIds.has(id))
    ) {
      return NextResponse.json(
        { error: "orderedIds must match all sibling menus under this parent" },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.subscriptionModuleMenu.update({
          where: { subscriptionModuleMenuId: id },
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
      return NextResponse.json({ error: "One or more menus were not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
