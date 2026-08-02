import { createTenantCompanyNameListHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameListHandlers({
  model: "propertyUsage",
  idField: "propertyUsageId",
  nameField: "propertyUsageName",
  label: "property usage",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
