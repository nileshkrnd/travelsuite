import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/**
 * Active menus for modules actively granted to a tenant (Module Access).
 * Ordered by module SortOrder, then menu SortOrder.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const grants = await prisma.subscriptionModuleAccess.findMany({
      where: {
        tenantId,
        isActive: true,
        module: { isActive: true },
      },
      select: { subscriptionModuleId: true },
    });

    const moduleIds = grants.map((g) => g.subscriptionModuleId);
    if (moduleIds.length === 0) {
      return NextResponse.json([]);
    }

    const rows = await prisma.subscriptionModuleMenu.findMany({
      where: {
        isActive: true,
        subscriptionModuleId: { in: moduleIds },
      },
      include: {
        module: {
          select: {
            subscriptionModuleName: true,
            sortOrder: true,
            product: { select: { subscriptionProductName: true } },
          },
        },
        parent: { select: { menuName: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { menuName: "asc" }],
    });

    // Module priority first, then menu priority within each module.
    rows.sort((a, b) => {
      const ma = a.module.sortOrder - b.module.sortOrder;
      if (ma !== 0) return ma;
      const sa = a.sortOrder - b.sortOrder;
      if (sa !== 0) return sa;
      return a.menuName.localeCompare(b.menuName);
    });

    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}
