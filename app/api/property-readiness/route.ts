import { NextResponse } from "next/server";
import { dbUnavailable } from "@/lib/api/db-error";
import { computePropertyReadiness } from "@/lib/api/property-readiness-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const role = searchParams.get("role") ?? "tenantAdmin";

    const propertyId = Number(propertyIdParam);
    const tenantId = Number(tenantIdParam);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }
    const companyId = companyIdParam ? Number(companyIdParam) : undefined;

    const result = await computePropertyReadiness(role, { tenantId, companyId, propertyId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Property not found") {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
