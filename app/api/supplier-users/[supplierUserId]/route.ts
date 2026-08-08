import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { hashPassword } from "@/lib/password";
import { serializeSupplierUserRow, supplierUserInclude, validateSupplierUserLookups } from "@/lib/api/supplier-user-helpers";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  supplierId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  dialCountryCode: z.string().trim().max(10).nullable().optional(),
  mobileNumber: z.string().trim().max(30).nullable().optional(),
  accessRoleId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
  updatedBy: z.number().int().positive(),
});

const patchSchema = z.object({ isActive: z.boolean(), updatedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ supplierUserId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { supplierUserId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.supplierUser.findUnique({ where: { supplierUserId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });

    const lookup = await validateSupplierUserLookups(data);
    if (lookup instanceof NextResponse) return lookup;

    const username = data.email.trim().toLowerCase();
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId: existing.userId },
        data: {
          username,
          userDisplayName: displayName,
          isActive: data.isActive ?? existing.isActive,
          modifiedBy: data.updatedBy,
          modifiedDtTm: new Date(),
          ...(data.password
            ? { passwordHash: hashPassword(data.password), lastPasswordChangeDtTm: new Date() }
            : {}),
        },
      });

      return tx.supplierUser.update({
        where: { supplierUserId: BigInt(id.data) },
        data: {
          supplierId: BigInt(data.supplierId),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: username,
          dialCountryCode: data.dialCountryCode?.trim() || null,
          mobileNumber: data.mobileNumber?.trim() || null,
          accessRoleId: data.accessRoleId,
          isActive: data.isActive ?? existing.isActive,
          updatedBy: data.updatedBy,
          updatedDate: new Date(),
        },
        include: supplierUserInclude,
      });
    });

    return NextResponse.json(serializeSupplierUserRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });
      if (error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.toLowerCase().includes("username")) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "This email is already registered for this supplier" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supplierUserId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const existing = await prisma.supplierUser.findUnique({ where: { supplierUserId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId: existing.userId },
        data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.updatedBy, modifiedDtTm: new Date() },
      });
      return tx.supplierUser.update({
        where: { supplierUserId: BigInt(id.data) },
        data: { isActive: parsed.data.isActive, updatedBy: parsed.data.updatedBy, updatedDate: new Date() },
        include: supplierUserInclude,
      });
    });

    return NextResponse.json(serializeSupplierUserRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supplierUserId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const existing = await prisma.supplierUser.findUnique({ where: { supplierUserId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.supplierUser.delete({ where: { supplierUserId: BigInt(id.data) } });
      await tx.user.delete({ where: { userId: existing.userId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplier user not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
