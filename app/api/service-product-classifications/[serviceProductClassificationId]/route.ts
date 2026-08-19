import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceTypeId: z.number().int().positive(),
  classificationCode: z.string().trim().min(1).max(50),
  classificationName: z.string().trim().min(1).max(150),
  parentClassificationId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(200).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductClassificationId: string }> };

/** P2003 covers most FK violations, but a self-referencing table's native RESTRICT can surface as an unmapped connector error instead — match on the Postgres error code/message as a fallback. */
function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

const rowInclude = {
  serviceType: { select: { serviceTypeName: true } },
  parent: { select: { classificationName: true } },
} as const;

async function withCompanyName<
  T extends {
    companyId: number;
    serviceProductClassificationId: bigint;
    serviceTypeId: bigint;
    parentClassificationId: bigint | null;
  },
>(row: T) {
  const company = await prisma.company.findUnique({
    where: { companyId: row.companyId },
    select: { companyName: true },
  });
  return {
    ...row,
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
    serviceTypeId: Number(row.serviceTypeId),
    parentClassificationId: row.parentClassificationId != null ? Number(row.parentClassificationId) : null,
    companyName: company?.companyName ?? null,
  };
}

/** Rejects self-parenting and cycles; requires the parent to belong to the same Service Type. */
async function assertValidParent(
  serviceTypeId: number,
  classificationId: number,
  parentClassificationId: number | null | undefined
): Promise<string | null> {
  if (parentClassificationId == null) return null;
  if (parentClassificationId === classificationId) return "A classification cannot be its own parent";

  const parent = await prisma.serviceProductClassificationMaster.findUnique({
    where: { serviceProductClassificationId: BigInt(parentClassificationId) },
  });
  if (!parent) return "Parent classification not found";
  if (Number(parent.serviceTypeId) !== serviceTypeId) {
    return "Parent classification must belong to the same service type";
  }

  let cursor: number | null = parentClassificationId;
  const seen = new Set<number>();
  while (cursor != null) {
    if (cursor === classificationId) return "Cannot set parent — would create a cycle";
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const row: { parentClassificationId: bigint | null } | null =
      await prisma.serviceProductClassificationMaster.findUnique({
        where: { serviceProductClassificationId: BigInt(cursor) },
        select: { parentClassificationId: true },
      });
    cursor = row?.parentClassificationId != null ? Number(row.parentClassificationId) : null;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductClassificationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid classification id" }, { status: 400 });

    const row = await prisma.serviceProductClassificationMaster.findUnique({
      where: { serviceProductClassificationId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Classification not found" }, { status: 404 });
    return NextResponse.json(await withCompanyName(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductClassificationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid classification id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const company = await prisma.company.findFirst({
      where: { companyId: data.companyId, tenantId: data.tenantId },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const serviceType = await prisma.serviceTypeMaster.findUnique({
      where: { serviceTypeId: BigInt(data.serviceTypeId) },
    });
    if (!serviceType) {
      return NextResponse.json({ error: "Service type not found" }, { status: 400 });
    }

    const parentError = await assertValidParent(data.serviceTypeId, id.data, data.parentClassificationId);
    if (parentError) {
      return NextResponse.json({ error: parentError }, { status: 400 });
    }

    const updated = await prisma.serviceProductClassificationMaster.update({
      where: { serviceProductClassificationId: BigInt(id.data) },
      data: {
        serviceTypeId: BigInt(data.serviceTypeId),
        classificationCode: data.classificationCode.trim().toUpperCase(),
        classificationName: data.classificationName.trim(),
        parentClassificationId:
          data.parentClassificationId != null ? BigInt(data.parentClassificationId) : null,
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Classification not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This classification code already exists for this service type" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductClassificationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid classification id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductClassificationMaster.update({
      where: { serviceProductClassificationId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Classification not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductClassificationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid classification id" }, { status: 400 });

    await prisma.serviceProductClassificationMaster.delete({
      where: { serviceProductClassificationId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Classification not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json(
        { error: "This classification has child classifications and cannot be deleted" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
