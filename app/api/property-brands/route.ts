import { createTenantCompanyNameListHandlers } from "@/lib/api/tenant-company-name-crud";

const handlers = createTenantCompanyNameListHandlers({
  model: "propertyBrand",
  idField: "propertyBrandId",
  nameField: "propertyBrandName",
  label: "property brand",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
