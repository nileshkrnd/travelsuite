import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyInclude,
  propertyWriteSchema,
  serializePropertyRow,
  toPropertyCreateData,
  validatePropertyLookups,
  withCompanyName,
} from "@/lib/api/property-helpers";

const createSchema = propertyWriteSchema.and(
  z.object({
    createdBy: z.number().int().positive(),
  })
);

/**
 * Property list — filter by TenantID / CompanyID.
 * `tenantId=0` (the app-layer "global" sentinel) or `global=true` returns only globally-managed
 * properties (TenantID IS NULL). A real `tenantId` returns just that tenant's own properties,
 * unless `includeGlobal=true` is also passed, which merges in the global properties too.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const propertyTypeIdParam = searchParams.get("propertyTypeId");
    const globalOnly = searchParams.get("global") === "true" || tenantIdParam === "0";
    const includeGlobal = searchParams.get("includeGlobal") === "true";
    const countryIdParam = searchParams.get("countryId");
    const stateIdParam = searchParams.get("stateId");
    const cityIdParam = searchParams.get("cityId");
    const areaIdParam = searchParams.get("areaId");
    const search = searchParams.get("search")?.trim() || "";
    const requireLocation = searchParams.get("requireLocation") === "true";
    const takeParam = Number(searchParams.get("take") ?? "");

    if (requireLocation) {
      const countryId = Number(countryIdParam);
      const cityId = Number(cityIdParam);
      if (!Number.isFinite(countryId) || countryId <= 0 || !Number.isFinite(cityId) || cityId <= 0) {
        return NextResponse.json(
          { error: "Country and city are required to list properties" },
          { status: 400 }
        );
      }
    }

    const where: Prisma.PropertyWhereInput = {};
    const andFilters: Prisma.PropertyWhereInput[] = [];

    if (globalOnly) {
      where.tenantId = null;
    } else if (tenantIdParam != null && tenantIdParam !== "") {
      const ownWhere: Prisma.PropertyWhereInput = { tenantId: Number(tenantIdParam) };
      if (companyIdParam != null && companyIdParam !== "") {
        ownWhere.companyId = Number(companyIdParam);
      }
      if (includeGlobal) {
        andFilters.push({ OR: [ownWhere, { tenantId: null }] });
      } else {
        Object.assign(where, ownWhere);
      }
    }
    if (activeOnly) where.isActive = true;
    if (propertyTypeIdParam != null && propertyTypeIdParam !== "") {
      where.typeLinks = { some: { propertyTypeId: BigInt(propertyTypeIdParam) } };
    }
    if (countryIdParam != null && countryIdParam !== "") {
      where.countryId = Number(countryIdParam);
    }
    if (stateIdParam != null && stateIdParam !== "") {
      where.stateId = Number(stateIdParam);
    }
    if (cityIdParam != null && cityIdParam !== "") {
      where.cityId = Number(cityIdParam);
    }
    if (areaIdParam != null && areaIdParam !== "") {
      where.areaId = Number(areaIdParam);
    }
    if (search) {
      andFilters.push({
        OR: [
          { propertyCode: { contains: search, mode: "insensitive" } },
          { propertyName: { contains: search, mode: "insensitive" } },
          { propertyDisplayName: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (andFilters.length) where.AND = andFilters;

    // Cap large catalogs when location-scoped (property access pickers).
    const hasLocationFilter =
      (countryIdParam != null && countryIdParam !== "") ||
      (cityIdParam != null && cityIdParam !== "");
    const take = Number.isFinite(takeParam) && takeParam > 0
      ? Math.min(Math.floor(takeParam), 2000)
      : hasLocationFilter
        ? 500
        : undefined;

    const rows = await prisma.property.findMany({
      where,
      include: propertyInclude,
      orderBy: [{ createdDtTm: "desc" }, { propertyCode: "asc" }],
      ...(take ? { take } : {}),
    });
    return NextResponse.json((await withCompanyName(rows)).map(serializePropertyRow));
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
    const lookupError = await validatePropertyLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.property.create({
      data: toPropertyCreateData(data),
      include: propertyInclude,
    });
    const [withName] = await withCompanyName([created]);
    return NextResponse.json(serializePropertyRow(withName), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This property code already exists for this company" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
