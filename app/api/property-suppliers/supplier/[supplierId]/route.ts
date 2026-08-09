import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppSupplierPropertyGrants } from "@/lib/mappers/property-supplier.mapper";
import {
  propertySupplierInclude,
  saveSupplierPropertyGrant,
  serializePropertySupplierRow,
  supplierPropertyGrantWriteSchema,
  validateSupplierPropertiesLookup,
} from "@/lib/api/property-supplier-helpers";

const idSchema = z.coerce.number().int().positive();

const createSchema = supplierPropertyGrantWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

const patchSchema = z.object({ isActive: z.boolean() });

type RouteContext = { params: Promise<{ supplierId: string }> };

/** The aggregated property grant for one supplier (may be empty). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const rows = await prisma.propertySupplier.findMany({
      where: { supplierId: BigInt(id.data) },
      include: propertySupplierInclude,
      orderBy: [{ propertyId: "asc" }],
    });
    const [grant] = toAppSupplierPropertyGrants(rows.map(serializePropertySupplierRow));
    if (!grant) return NextResponse.json({ error: "No property links for this supplier" }, { status: 404 });
    return NextResponse.json(grant);
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Full-replace save of this supplier's property links. */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookup = await validateSupplierPropertiesLookup(id.data, data.propertyIds);
    if (lookup instanceof NextResponse) return lookup;

    const rows = await saveSupplierPropertyGrant(id.data, data);
    const [grant] = toAppSupplierPropertyGrants(rows.map(serializePropertySupplierRow));
    return NextResponse.json(grant, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "One or more of these properties are already linked" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const { count } = await prisma.propertySupplier.updateMany({
      where: { supplierId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive },
    });
    if (count === 0) return NextResponse.json({ error: "No property links for this supplier" }, { status: 404 });

    const rows = await prisma.propertySupplier.findMany({
      where: { supplierId: BigInt(id.data) },
      include: propertySupplierInclude,
      orderBy: [{ propertyId: "asc" }],
    });
    const [grant] = toAppSupplierPropertyGrants(rows.map(serializePropertySupplierRow));
    return NextResponse.json(grant);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    await prisma.propertySupplier.deleteMany({ where: { supplierId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
