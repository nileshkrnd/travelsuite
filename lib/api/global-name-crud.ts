import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

type GlobalNameDelegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export type GlobalNameMasterConfig = {
  /** Prisma model accessor on admin client, e.g. propertyBrand */
  model: keyof typeof prisma;
  /** BigInt primary key field, e.g. propertyBrandId */
  idField: string;
  nameField: string;
  label: string;
};

function delegate(config: GlobalNameMasterConfig): GlobalNameDelegate {
  return prisma[config.model] as unknown as GlobalNameDelegate;
}

/** Parses a route param into a positive BigInt id, or null if invalid. */
function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

function serializeRow(row: Record<string, unknown>, idField: string) {
  return { ...row, [idField]: Number(row[idField] as bigint) };
}

export function createGlobalNameListHandlers(config: GlobalNameMasterConfig) {
  const createSchema = z.object({
    [config.nameField]: z.string().trim().min(1).max(100),
    isActive: z.boolean().optional(),
    createdBy: z.number().int().positive(),
  });

  async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get("activeOnly") === "true";

      const where: Record<string, unknown> = {};
      if (activeOnly) where.isActive = true;

      const rows = await delegate(config).findMany({
        where,
        orderBy: [{ [config.nameField]: "asc" }],
      });
      return NextResponse.json(rows.map((r) => serializeRow(r, config.idField)));
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
      const created = await delegate(config).create({
        data: {
          [config.nameField]: String(data[config.nameField]).trim(),
          isActive: (data.isActive as boolean | undefined) ?? true,
          createdBy: data.createdBy,
        },
      });
      return NextResponse.json(serializeRow(created, config.idField), { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: `This ${config.label} already exists` }, { status: 409 });
      }
      return dbUnavailable(error);
    }
  }

  return { GET, POST };
}

export function createGlobalNameItemHandlers(config: GlobalNameMasterConfig) {
  const updateSchema = z.object({
    [config.nameField]: z.string().trim().min(1).max(100),
    isActive: z.boolean().optional(),
    modifiedBy: z.number().int().positive(),
  });
  const patchSchema = z.object({
    isActive: z.boolean(),
    modifiedBy: z.number().int().positive(),
  });

  type RouteContext = { params: Promise<Record<string, string>> };

  function extractId(params: Record<string, string>) {
    const raw = params[config.idField] ?? Object.values(params)[0];
    return parseId(raw);
  }

  async function GET(_request: Request, context: RouteContext) {
    try {
      const id = extractId(await context.params);
      if (id == null) return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });

      const row = await delegate(config).findUnique({ where: { [config.idField]: id } });
      if (!row) return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
      return NextResponse.json(serializeRow(row, config.idField));
    } catch (error) {
      return dbUnavailable(error);
    }
  }

  async function PUT(request: Request, context: RouteContext) {
    try {
      const id = extractId(await context.params);
      if (id == null) return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }

      const data = parsed.data as Record<string, unknown>;
      const updated = await delegate(config).update({
        where: { [config.idField]: id },
        data: {
          [config.nameField]: String(data[config.nameField]).trim(),
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
      return NextResponse.json(serializeRow(updated, config.idField));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
        }
        if (error.code === "P2002") {
          return NextResponse.json({ error: `This ${config.label} already exists` }, { status: 409 });
        }
      }
      return dbUnavailable(error);
    }
  }

  async function PATCH(request: Request, context: RouteContext) {
    try {
      const id = extractId(await context.params);
      if (id == null) return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });

      const body = await request.json();
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }

      const updated = await delegate(config).update({
        where: { [config.idField]: id },
        data: {
          isActive: parsed.data.isActive,
          modifiedBy: parsed.data.modifiedBy,
          modifiedDtTm: new Date(),
        },
      });
      return NextResponse.json(serializeRow(updated, config.idField));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
      }
      return dbUnavailable(error);
    }
  }

  async function DELETE(_request: Request, context: RouteContext) {
    try {
      const id = extractId(await context.params);
      if (id == null) return NextResponse.json({ error: `Invalid ${config.label} id` }, { status: 400 });

      await delegate(config).delete({ where: { [config.idField]: id } });
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return NextResponse.json({ error: `${config.label} not found` }, { status: 404 });
        }
        if (error.code === "P2003") {
          return NextResponse.json(
            { error: `This ${config.label} is in use and cannot be deleted` },
            { status: 409 }
          );
        }
      }
      return dbUnavailable(error);
    }
  }

  return { GET, PUT, PATCH, DELETE };
}
