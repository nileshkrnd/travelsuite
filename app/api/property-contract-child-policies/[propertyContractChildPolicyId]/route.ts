import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractChildPolicyInclude,
  propertyContractChildPolicyWriteSchema,
  serializePropertyContractChildPolicyRow,
  updatePropertyContractChildPolicyWithChildren,
  validatePropertyContractChildPolicyLookups,
} from "@/lib/api/property-contract-child-policy-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyContractChildPolicyWriteSchema.and(
  z.object({ modifiedBy: z.number().int().positive() })
);
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyContractChildPolicyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractChildPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyContractChildPolicy.findUnique({
      where: { propertyContractChildPolicyId: BigInt(id.data) },
      include: propertyContractChildPolicyInclude,
    });
    if (!row) return NextResponse.json({ error: "Child policy not found" }, { status: 404 });
    return NextResponse.json(serializePropertyContractChildPolicyRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyContractChildPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyContractChildPolicyLookups(data);
    if (lookupError) return lookupError;

    const updated = await updatePropertyContractChildPolicyWithChildren(BigInt(id.data), data);
    return NextResponse.json(serializePropertyContractChildPolicyRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Child policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyContractChildPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyContractChildPolicy.update({
      where: { propertyContractChildPolicyId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyContractChildPolicyInclude,
    });
    return NextResponse.json(serializePropertyContractChildPolicyRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Child policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyContractChildPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyContractChildPolicy.delete({
      where: { propertyContractChildPolicyId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Child policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
