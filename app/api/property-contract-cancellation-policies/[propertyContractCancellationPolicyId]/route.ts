import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractCancellationPolicyInclude,
  propertyContractCancellationPolicyWriteSchema,
  serializePropertyContractCancellationPolicyRow,
  updatePropertyContractCancellationPolicyWithChildren,
  validatePropertyContractCancellationPolicyLookups,
} from "@/lib/api/property-contract-cancellation-policy-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyContractCancellationPolicyWriteSchema.and(
  z.object({ modifiedBy: z.number().int().positive() })
);
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyContractCancellationPolicyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyContractCancellationPolicy.findUnique({
      where: { propertyContractCancellationPolicyId: BigInt(id.data) },
      include: propertyContractCancellationPolicyInclude,
    });
    if (!row) return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
    return NextResponse.json(serializePropertyContractCancellationPolicyRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyContractCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyContractCancellationPolicyLookups(data);
    if (lookupError) return lookupError;

    const updated = await updatePropertyContractCancellationPolicyWithChildren(BigInt(id.data), data);
    return NextResponse.json(serializePropertyContractCancellationPolicyRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Policy code already exists on this contract" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyContractCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyContractCancellationPolicy.update({
      where: { propertyContractCancellationPolicyId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyContractCancellationPolicyInclude,
    });
    return NextResponse.json(serializePropertyContractCancellationPolicyRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyContractCancellationPolicyId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyContractCancellationPolicy.delete({
      where: { propertyContractCancellationPolicyId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
