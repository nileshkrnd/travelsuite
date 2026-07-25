import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { hashPassword } from "@/lib/password";
import { UserType } from "@/types";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  title: z.string().trim().min(1).max(10),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  gender: z.string().trim().min(1).max(10),
  countryDialCode: z.string().trim().min(1).max(5),
  phoneNumber: z.string().trim().min(1).max(20),
  faxNumber: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(50),
  address: z.string().trim().min(1).max(50),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  employeeNumber: z.string().trim().min(1).max(50),
  designationId: z.number().int().positive(),
  joiningDate: z.string().min(1),
  accessRoleId: z.number().int().positive(),
  departmentId: z.number().int().positive().nullable().optional(),
  reportingEmployeeId: z.number().int().positive().nullable().optional(),
  companyId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  employeeImage: z.string().trim().max(100).nullable().optional(),
  tenantId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

const employeeInclude = {
  company: { select: { companyName: true } },
  branch: { select: { branchName: true } },
  designation: { select: { designationName: true } },
  department: { select: { departmentName: true } },
  accessRole: { select: { accessRoleName: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
  reportingEmployee: { select: { firstName: true, lastName: true, title: true } },
} as const;

type RouteContext = { params: Promise<{ employeeId: string }> };

function flatten(
  row: Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>
) {
  const report = row.reportingEmployee;
  return {
    ...row,
    companyName: row.company.companyName,
    branchName: row.branch.branchName,
    designationName: row.designation.designationName,
    departmentName: row.department?.departmentName ?? null,
    accessRoleName: row.accessRole.accessRoleName,
    countryName: row.country.countryName,
    cityName: row.city.cityName,
    reportingEmployeeName: report
      ? `${report.title} ${report.firstName} ${report.lastName}`.trim()
      : null,
    company: undefined,
    branch: undefined,
    designation: undefined,
    department: undefined,
    accessRole: undefined,
    country: undefined,
    city: undefined,
    reportingEmployee: undefined,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const row = await prisma.employee.findUnique({
      where: { employeeId: id.data },
      include: employeeInclude,
    });
    if (!row) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json(flatten(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const joiningDate = new Date(data.joiningDate);
    if (Number.isNaN(joiningDate.getTime())) {
      return NextResponse.json({ error: "Invalid joining date" }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { employeeId: id.data } });
    if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    if (data.reportingEmployeeId === id.data) {
      return NextResponse.json({ error: "Employee cannot report to themselves" }, { status: 400 });
    }

    const username = data.email.trim().toLowerCase();
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId: existing.userId },
        data: {
          username,
          userDisplayName: displayName,
          userTypeId: UserType.InternalEmployee,
          companyId: data.companyId,
          tenantId: data.tenantId,
          isActive: data.isActive ?? existing.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
          ...(data.password
            ? { passwordHash: hashPassword(data.password), lastPasswordChangeDtTm: new Date() }
            : {}),
        },
      });

      return tx.employee.update({
        where: { employeeId: id.data },
        data: {
          title: data.title.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          gender: data.gender.trim(),
          countryDialCode: data.countryDialCode.trim().slice(0, 5),
          phoneNumber: data.phoneNumber.trim(),
          faxNumber: data.faxNumber?.trim() || null,
          email: username,
          address: data.address.trim(),
          countryId: data.countryId,
          cityId: data.cityId,
          employeeNumber: data.employeeNumber.trim(),
          designationId: data.designationId,
          joiningDate,
          accessRoleId: data.accessRoleId,
          departmentId: data.departmentId ?? null,
          reportingEmployeeId: data.reportingEmployeeId ?? null,
          companyId: data.companyId,
          branchId: data.branchId,
          employeeImage: data.employeeImage?.trim() || null,
          tenantId: data.tenantId,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(flatten(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Email or employee number already in use" }, { status: 409 });
      }
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Invalid related master reference" }, { status: 400 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findUnique({ where: { employeeId: id.data } });
    if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId: existing.userId },
        data: {
          isActive: parsed.data.isActive,
          modifiedBy: parsed.data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
      return tx.employee.update({
        where: { employeeId: id.data },
        data: {
          isActive: parsed.data.isActive,
          modifiedBy: parsed.data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(flatten(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const existing = await prisma.employee.findUnique({ where: { employeeId: id.data } });
    if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({ where: { employeeId: id.data } });
      await tx.user.delete({ where: { userId: existing.userId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
