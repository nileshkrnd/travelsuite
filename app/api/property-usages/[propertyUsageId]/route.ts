import { createTenantCompanyNameItemHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameItemHandlers({
  model: "propertyUsage",
  idField: "propertyUsageId",
  nameField: "propertyUsageName",
  label: "property usage",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
