import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { hashPassword } from "@/lib/password";

const createSchema = z.object({
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
  password: z.string().min(6).max(200),
  createdBy: z.number().int().positive(),
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.EmployeeWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return NextResponse.json(rows.map(flatten));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
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

    const company = await prisma.company.findFirst({
      where: { companyId: data.companyId, tenantId: data.tenantId },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const branch = await prisma.branch.findFirst({
      where: { branchId: data.branchId, companyId: data.companyId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found for this company" }, { status: 400 });
    }

    const username = data.email.trim().toLowerCase();
    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash: hashPassword(data.password),
          userDisplayName: displayName,
          tenantId: data.tenantId,
          companyId: data.companyId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
          lastPasswordChangeDtTm: new Date(),
        },
      });

      return tx.employee.create({
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
          userId: user.userId,
          employeeImage: data.employeeImage?.trim() || null,
          tenantId: data.tenantId,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(flatten(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("Username") || target.includes("username")) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
        return NextResponse.json(
          { error: "Employee number already exists for this company" },
          { status: 409 }
        );
      }
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Invalid related master reference" }, { status: 400 });
      }
    }
    return dbUnavailable(error);
  }
}
