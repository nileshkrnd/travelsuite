import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

/** Active menus for modules actively granted to a tenant. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = Number(searchParams.get("tenantId"));
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const rows = await prisma.subscriptionModuleMenu.findMany({
      where: {
        isActive: true,
        module: {
          isActive: true,
          access: {
            some: {
              tenantId,
              isActive: true,
            },
          },
        },
      },
      include: {
        module: {
          select: {
            subscriptionModuleName: true,
            product: { select: { subscriptionProductName: true } },
          },
        },
      },
      orderBy: [{ menuName: "asc" }],
    });
    return NextResponse.json(rows);
  } catch (error) {
    return dbUnavailable(error);
  }
}
