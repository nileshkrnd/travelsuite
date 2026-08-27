import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  findUnitStatusId,
  propertyUnitInclude,
  refreshFloorUnitCounts,
  serializePropertyUnits,
} from "@/lib/api/property-floor-unit-helpers";

function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

const occupancySchema = z.object({
  action: z.enum(["allocate", "vacate", "block", "unblock"]),
  propertyTenantId: z.number().int().positive().optional(),
  allocatedFrom: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(250).nullable().optional(),
  modifiedBy: z.number().int().positive(),
});

function parseDateOnly(raw: string | undefined): string {
  const value = raw?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date");
  }
  return value;
}

type RouteContext = { params: Promise<{ unitId: string }> };

type ActiveAllocation = { unitAllocationId: bigint };

async function findActiveAllocation(unitId: bigint) {
  const rows = await prisma.$queryRaw<ActiveAllocation[]>`
    SELECT "UnitAllocationID" AS "unitAllocationId"
    FROM "UnitTenantAllocation"
    WHERE "UnitID" = ${unitId} AND "IsActive" = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function loadSerializedUnit(unitId: bigint) {
  const updated = await prisma.propertyUnit.findUnique({
    where: { unitId },
    include: propertyUnitInclude,
  });
  if (!updated) return null;
  await refreshFloorUnitCounts(updated.propertyFloorId);
  const [serialized] = await serializePropertyUnits([updated]);
  return serialized;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).unitId);
    if (id == null) return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });

    const body = await request.json();
    const parsed = occupancySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const unit = await prisma.propertyUnit.findUnique({
      where: { unitId: id },
      include: { unitStatus: { select: { statusCode: true } } },
    });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const statusCode = unit.unitStatus.statusCode.toUpperCase();
    const occupiedId = await findUnitStatusId("OCCUPIED");
    const availableId = await findUnitStatusId("AVAILABLE");
    const blockedId = await findUnitStatusId("BLOCKED");
    if (!occupiedId || !availableId || !blockedId) {
      return NextResponse.json({ error: "Unit statuses are not configured" }, { status: 400 });
    }

    if (data.action === "allocate") {
      if (!data.propertyTenantId) {
        return NextResponse.json({ error: "Select a tenant" }, { status: 400 });
      }
      if (statusCode === "SOLD" || statusCode === "INACTIVE") {
        return NextResponse.json({ error: "This unit cannot be allocated" }, { status: 400 });
      }
      const tenant = await prisma.propertyTenant.findUnique({
        where: { propertyTenantId: BigInt(data.propertyTenantId) },
      });
      if (!tenant || !tenant.isActive) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
      }
      if (await findActiveAllocation(id)) {
        return NextResponse.json({ error: "This unit already has a tenant. Vacate it first." }, { status: 409 });
      }
      let allocatedFrom: string;
      try {
        allocatedFrom = parseDateOnly(data.allocatedFrom);
      } catch {
        return NextResponse.json({ error: "Invalid allocation date" }, { status: 400 });
      }
      const notes = data.notes?.trim() || null;
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO "UnitTenantAllocation"
            ("UnitID", "PropertyTenantID", "AllocatedFrom", "Notes", "IsActive", "CreatedBy")
          VALUES
            (${id}, ${BigInt(data.propertyTenantId!)}, ${allocatedFrom}, ${notes}, true, ${data.modifiedBy})
        `;
        if (statusCode !== "BLOCKED") {
          await tx.propertyUnit.update({
            where: { unitId: id },
            data: { unitStatusId: occupiedId, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() },
          });
        }
      });
    } else if (data.action === "vacate") {
      const active = await findActiveAllocation(id);
      if (!active) {
        return NextResponse.json({ error: "This unit has no allocated tenant" }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE "UnitTenantAllocation"
          SET "IsActive" = false,
              "AllocatedTo" = CURRENT_DATE,
              "UpdatedBy" = ${data.modifiedBy},
              "UpdatedDate" = NOW()
          WHERE "UnitAllocationID" = ${active.unitAllocationId}
        `;
        if (statusCode === "OCCUPIED") {
          await tx.propertyUnit.update({
            where: { unitId: id },
            data: { unitStatusId: availableId, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() },
          });
        }
      });
    } else if (data.action === "block") {
      if (statusCode === "SOLD") {
        return NextResponse.json({ error: "Sold units cannot be blocked" }, { status: 400 });
      }
      if (statusCode === "BLOCKED") {
        return NextResponse.json({ error: "This unit is already blocked" }, { status: 400 });
      }
      const reason = data.notes?.trim() || null;
      await prisma.$executeRaw`
        UPDATE "UnitMaster"
        SET "UnitStatusID" = ${blockedId},
            "BlockReason" = ${reason},
            "UpdatedBy" = ${data.modifiedBy},
            "UpdatedDate" = NOW()
        WHERE "UnitID" = ${id}
      `;
    } else {
      if (statusCode !== "BLOCKED") {
        return NextResponse.json({ error: "This unit is not blocked" }, { status: 400 });
      }
      const active = await findActiveAllocation(id);
      const nextStatus = active ? occupiedId : availableId;
      await prisma.$executeRaw`
        UPDATE "UnitMaster"
        SET "UnitStatusID" = ${nextStatus},
            "BlockReason" = NULL,
            "UpdatedBy" = ${data.modifiedBy},
            "UpdatedDate" = NOW()
        WHERE "UnitID" = ${id}
      `;
    }

    const serialized = await loadSerializedUnit(id);
    if (!serialized) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This unit already has an active tenant" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
