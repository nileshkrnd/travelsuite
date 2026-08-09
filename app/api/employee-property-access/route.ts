import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { employeePropertyAccessInclude, serializeRows } from "@/lib/api/employee-property-access-helpers";

/** Flat rows — one per (employee, property), or one per employee with PropertyID = NULL ("all properties"). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const employeeIdParam = searchParams.get("employeeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.EmployeePropertyAccessWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (employeeIdParam) where.employeeId = Number(employeeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.employeePropertyAccess.findMany({
      where,
      include: employeePropertyAccessInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(serializeRows(rows));
  } catch (error) {
    return dbUnavailable(error);
  }
}
