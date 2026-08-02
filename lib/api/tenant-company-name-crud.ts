import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

type NameMasterDelegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export type TenantCompanyNameMasterConfig = {
  /** Prisma model accessor on admin client, e.g. propertyCategory */
  model: keyof typeof prisma;
  idField: string;
  nameField: string;
  label: string;
};

async function withCompanyName<T extends { companyId: number }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId))];
  if (companyIds.length === 0) return rows.map((r) => ({ ...r, companyName: null as string | null }));
  const companies = await prisma.company.findMany({
    where: { companyId: { in: companyIds } },
    select: { companyId: true, companyName: true },
  });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({ ...r, companyName: nameById.get(r.companyId) ?? null }));
}

function delegate(config: TenantCompanyNameMasterConfig): NameMasterDelegate {
  return prisma[config.model] as unknown as NameMasterDelegate;
}

export function createTenantCompanyNameListHandlers(config: TenantCompanyNameMasterConfig) {
  const createSchema = z.object({
    [config.nameField]: z.string().trim().min(1).max(100),
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    isActive: z.boolean().optional(),
    createdBy: z.number().int().positive(),
  });

  async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const tenantIdParam = searchParams.get("tenantId");
      const companyIdParam = searchParams.get("companyId");
      const activeOnly = searchParams.get("activeOnly") === "true";

      const where: Record<string, unknown> = {};
      if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
      if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
      if (activeOnly) where.isActive = true;

      const rows = await delegate(config).findMany({
        where,
        orderBy: [{ [config.nameField]: "asc" }],
      });
      return NextResponse.json(await withCompanyName(rows as { companyId: number }[]));
    } catch (error) {
      return dbUnavailable(error);
    }
  }

  async function POST(request: Request) {
    try {
      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }

      const data = parsed.data as Record<string, unknown>;
      const tenantId = data.tenantId as number;
      const companyId = data.companyId as number;
      const name = String(data[config.nameField]).trim();

      const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
      if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 400 });

      const company = await prisma.company.findFirst({ where: { companyId, tenantId } });
      if (!company) {
        return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
      }

      const created = await delegate(config).create({
        data: {
          [config.nameField]: name,
          tenantId,
          companyId,
          isActive: (data.isActive as boolean | undefined) ?? true,
          createdBy: data.createdBy,
        },
      });
      const [withName] = await withCompanyName([created as { companyId: number }]);
      return NextResponse.json(withName, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: `This ${config.label} already exists for this company` },
          { status: 409 }
        );
      }
      return dbUnavailable(error);
    }
  }

  return { GET, POST };
}

export function createTenantCompanyNameItemHandlers(config: TenantCompanyNameMasterConfig) {
  const idSchema = z.coerce.number().int().positive();
  const updateSchema = z.object({
    [config.nameField]: z.string().trim().min(1).max(100),
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    isActive: z.boolean().optional(),
    modifiedBy: z.number().int().positive(),
  });
  const patchSchema = z.object({
    isActive: z.boolean(),
    modifiedBy: z.number().int().positive(),
  });

  type RouteContext = { params: Promise<Record<string, string>> };

  async function withOneCompanyName<T extends { companyId: number }>(row: T) {
    const [withName] = await withCompanyName([row]);
    return withName;
  }

  async function GET(_request: Request, context: RouteContext) {
    try {
      const params = await context.params;
      const raw = params[config.idField] ?? Object.values(params)[0];
      const id = idSchema.safeParse(raw);
      if (!id.success) {
        return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });
      }

      const row = await delegate(config).findUnique({ where: { [config.idField]: id.data } });
      if (!row) return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
      return NextResponse.json(await withOneCompanyName(row as { companyId: number }));
    } catch (error) {
      return dbUnavailable(error);
    }
  }

  async function PUT(request: Request, context: RouteContext) {
    try {
      const params = await context.params;
      const raw = params[config.idField] ?? Object.values(params)[0];
      const id = idSchema.safeParse(raw);
      if (!id.success) {
        return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });
      }

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }

      const data = parsed.data as Record<string, unknown>;
      const tenantId = data.tenantId as number;
      const companyId = data.companyId as number;
      const company = await prisma.company.findFirst({ where: { companyId, tenantId } });
      if (!company) {
        return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
      }

      const updated = await delegate(config).update({
        where: { [config.idField]: id.data },
        data: {
          [config.nameField]: String(data[config.nameField]).trim(),
          tenantId,
          companyId,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
      return NextResponse.json(await withOneCompanyName(updated as { companyId: number }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
        }
        if (error.code === "P2002") {
          return NextResponse.json(
            { error: `This ${config.label} already exists for this company` },
            { status: 409 }
          );
        }
      }
      return dbUnavailable(error);
    }
  }

  async function PATCH(request: Request, context: RouteContext) {
    try {
      const params = await context.params;
      const raw = params[config.idField] ?? Object.values(params)[0];
      const id = idSchema.safeParse(raw);
      if (!id.success) {
        return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });
      }

      const body = await request.json();
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }

      const updated = await delegate(config).update({
        where: { [config.idField]: id.data },
        data: {
          isActive: parsed.data.isActive,
          modifiedBy: parsed.data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
      return NextResponse.json(await withOneCompanyName(updated as { companyId: number }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
      }
      return dbUnavailable(error);
    }
  }

  async function DELETE(_request: Request, context: RouteContext) {
    try {
      const params = await context.params;
      const raw = params[config.idField] ?? Object.values(params)[0];
      const id = idSchema.safeParse(raw);
      if (!id.success) {
        return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });
      }

      await delegate(config).delete({ where: { [config.idField]: id.data } });
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
      }
      return dbUnavailable(error);
    }
  }

  return { GET, PUT, PATCH, DELETE };
}
