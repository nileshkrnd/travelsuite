import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppPropertySetupNote } from "@/lib/mappers/property-setup-note.mapper";

const createSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyId: z.number().int().positive(),
  stepCode: z.string().trim().max(50).nullable().optional(),
  note: z.string().trim().min(1, "Note is required").max(4000),
  priority: z.enum(["low", "normal", "high"]).optional(),
  createdBy: z.number().int().positive(),
});

async function resolveAuthorNames(createdByIds: number[]): Promise<Map<number, string>> {
  const uniqueIds = [...new Set(createdByIds)];
  if (uniqueIds.length === 0) return new Map();
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: uniqueIds } },
    select: { employeeId: true, title: true, firstName: true, lastName: true },
  });
  const names = new Map<number, string>();
  for (const emp of employees) {
    names.set(emp.employeeId, `${emp.title} ${emp.firstName} ${emp.lastName}`.replace(/\s+/g, " ").trim());
  }
  return names;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const propertyId = Number(propertyIdParam);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const rows = await prisma.propertySetupNote.findMany({
      where: { propertyId },
      orderBy: { createdDtTm: "desc" },
    });
    const names = await resolveAuthorNames(rows.map((r) => r.createdBy));
    return NextResponse.json(
      rows.map((row) => toAppPropertySetupNote(row, names.get(row.createdBy) ?? `User #${row.createdBy}`))
    );
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const created = await prisma.propertySetupNote.create({
      data: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyId: data.propertyId,
        stepCode: data.stepCode || null,
        note: data.note,
        priority: data.priority ?? "normal",
        createdBy: data.createdBy,
      },
    });
    const names = await resolveAuthorNames([created.createdBy]);
    return NextResponse.json(
      toAppPropertySetupNote(created, names.get(created.createdBy) ?? `User #${created.createdBy}`),
      { status: 201 }
    );
  } catch (error) {
    return dbUnavailable(error);
  }
}
