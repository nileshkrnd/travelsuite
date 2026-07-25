import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { joinList } from "@/lib/mappers/tenant.mapper";

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

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
  tenantUid: z.string().trim().max(100).optional(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid")?.trim();

    if (uid) {
      const tenant = await prisma.tenant.findUnique({ where: { tenantUid: uid } });
      return NextResponse.json(tenant ? [tenant] : []);
    }

    const tenants = await prisma.tenant.findMany({ orderBy: { tenantName: "asc" } });
    return NextResponse.json(tenants);
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
    const currencies = data.supportedCurrencies?.length
      ? data.supportedCurrencies
      : [data.defaultCurrency];

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.tenant.create({
        data: {
          tenantUid: data.tenantUid?.trim() || `tenant_tmp_${Date.now()}`,
          tenantCode: data.tenantCode,
          tenantName: data.tenantName,
          groupName: data.groupName?.trim() || data.tenantName,
          defaultCurrency: data.defaultCurrency,
          supportedCurrencies: joinList(currencies),
          defaultLocale: data.defaultLocale ?? "en",
          supportedLocales: joinList(data.supportedLocales?.length ? data.supportedLocales : ["en"]),
          primaryColor: data.primaryColor || "#C45C26",
          logoUrl: data.logoUrl ?? "",
          addressLine1: data.address.line1,
          addressLine2: data.address.line2 || null,
          country: data.address.country,
          city: data.address.city,
          zip: data.address.zip,
          timezone: data.address.timezone,
          email: data.contact.email,
          dialCode: data.contact.dialCode,
          phone: data.contact.phone,
          status: data.status ?? "active",
          createdBy: data.createdBy,
        },
      });

      // Stabilize app uid to tenant_{TenantID} when caller did not supply one.
      if (!data.tenantUid?.trim()) {
        return tx.tenant.update({
          where: { tenantId: row.tenantId },
          data: { tenantUid: `tenant_${row.tenantId}` },
        });
      }
      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Tenant code or id is already in use" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
