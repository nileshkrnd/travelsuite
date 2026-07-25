import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  departmentCode: z.string().trim().min(1).max(20),
  departmentName: z.string().trim().min(1).max(50),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ departmentId: string }> };

async function withCompanyName<T extends { companyId: number }>(row: T) {
  const company = await prisma.company.findUnique({
    where: { companyId: row.companyId },
    select: { companyName: true },
  });
  return { ...row, companyName: company?.companyName ?? null };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { departmentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    const row = await prisma.department.findUnique({ where: { departmentId: id.data } });
    if (!row) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    return NextResponse.json(await withCompanyName(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { departmentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const company = await prisma.company.findFirst({
      where: { companyId: data.companyId, tenantId: data.tenantId },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const updated = await prisma.department.update({
      where: { departmentId: id.data },
      data: {
        departmentCode: data.departmentCode.trim(),
        departmentName: data.departmentName.trim(),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This department code already exists for this company" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { departmentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.department.update({
      where: { departmentId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { departmentId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    await prisma.department.delete({ where: { departmentId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
