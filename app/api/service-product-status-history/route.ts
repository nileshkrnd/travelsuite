import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const rowInclude = {
  fromStatus: { select: { statusName: true } },
  toStatus: { select: { statusName: true } },
} as const;

function serialize<T extends { serviceProductStatusHistoryId: bigint; serviceProductId: bigint; fromCommonStatusId: bigint | null; toCommonStatusId: bigint }>(
  row: T
) {
  return {
    ...row,
    serviceProductStatusHistoryId: Number(row.serviceProductStatusHistoryId),
    serviceProductId: Number(row.serviceProductId),
    fromCommonStatusId: row.fromCommonStatusId != null ? Number(row.fromCommonStatusId) : null,
    toCommonStatusId: Number(row.toCommonStatusId),
  };
}

/** Read-only audit log — rows are only ever created automatically by the Service Product route when its status changes. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceProductIdParam = searchParams.get("serviceProductId");
    if (!serviceProductIdParam) {
      return NextResponse.json({ error: "serviceProductId is required" }, { status: 400 });
    }
    const rows = await prisma.serviceProductStatusHistory.findMany({
      where: { serviceProductId: BigInt(serviceProductIdParam) },
      include: rowInclude,
      orderBy: [{ changedDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    return dbUnavailable(error);
  }
}
