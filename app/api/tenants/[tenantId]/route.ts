import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { joinList } from "@/lib/mappers/tenant.mapper";

const idSchema = z.coerce.number().int().positive();

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  country: z.string().trim().min(1).max(10),
  city: z.string().trim().min(1).max(100),
  zip: z.string().trim().min(1).max(30),
  timezone: z.string().trim().min(1).max(100),
});

const contactSchema = z.object({
  email: z.string().trim().email().max(200),
  dialCode: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(1).max(50),
});

const updateSchema = z.object({
  tenantCode: z.string().trim().min(1).max(100),
  tenantName: z.string().trim().min(1).max(200),
  groupName: z.string().trim().max(200).optional(),
  defaultCurrency: z.string().trim().min(1).max(10),
  supportedCurrencies: z.array(z.string()).optional(),
  defaultLocale: z.string().trim().max(10).optional(),
  supportedLocales: z.array(z.string()).optional(),
  primaryColor: z.string().trim().max(20).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  address: addressSchema,
  contact: contactSchema,
  status: z.enum(["active", "inactive"]).optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  status: z.enum(["active", "inactive"]),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: rawId } = await context.params;
    const tenantId = idSchema.safeParse(rawId);
    if (!tenantId.success) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { tenantId: tenantId.data } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: rawId } = await context.params;
    const tenantId = idSchema.safeParse(rawId);
    if (!tenantId.success) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const currencies = data.supportedCurrencies?.length
      ? data.supportedCurrencies
      : [data.defaultCurrency];

    const tenant = await prisma.tenant.update({
      where: { tenantId: tenantId.data },
      data: {
        tenantCode: data.tenantCode,
        tenantName: data.tenantName,
        groupName: data.groupName?.trim() || data.tenantName,
        defaultCurrency: data.defaultCurrency,
        supportedCurrencies: joinList(currencies),
        defaultLocale: data.defaultLocale ?? "en",
        supportedLocales: joinList(data.supportedLocales?.length ? data.supportedLocales : ["en"]),
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
        addressLine1: data.address.line1,
        addressLine2: data.address.line2 || null,
        country: data.address.country,
        city: data.address.city,
        zip: data.address.zip,
        timezone: data.address.timezone,
        email: data.contact.email,
        dialCode: data.contact.dialCode,
        phone: data.contact.phone,
        status: data.status,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Tenant code is already in use" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: rawId } = await context.params;
    const tenantId = idSchema.safeParse(rawId);
    if (!tenantId.success) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { tenantId: tenantId.data },
      data: {
        status: parsed.data.status,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
